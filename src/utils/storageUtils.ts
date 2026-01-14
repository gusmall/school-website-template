import { supabase } from '@/integrations/supabase/client';

/**
 * ฟังก์ชันสำหรับอัปโหลดรูปภาพไปยัง Supabase Storage
 * รองรับทั้ง File ปกติ และ Blob (ที่ได้จากการบีบอัด)
 */
export const uploadImage = async (
    file: File | Blob, 
    customFileName?: string, 
    bucket: string = 'school-images'
) => {
    try {
        // 1. ตรวจสอบ Session และ User (เพื่อยืนยันว่า Logged in จริงไหม)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('[Storage] Auth Error:', authError);
            throw new Error('กรุณาเข้าสู่ระบบใหม่ (Session อาจหมดอายุ) ก่อนทำการอัปโหลด');
        }

        console.log(`[Storage] ยืนยันตัวตนผู้ใช้สำเร็จ: ${user.email} (ID: ${user.id})`);

        // 2. จัดการเรื่องนามสกุลไฟล์และ Content Type
        let fileExt = 'webp';
        let contentType = 'image/webp';

        if (file instanceof File) {
            const parts = file.name.split('.');
            fileExt = parts.length > 1 ? parts.pop()! : 'jpg';
            contentType = file.type;
        } else if (customFileName) {
            const parts = customFileName.split('.');
            fileExt = parts.length > 1 ? parts.pop()! : 'webp';
        }

        // 3. สร้างชื่อไฟล์แบบสุ่ม (ป้องกันอักขระพิเศษและชื่อซ้ำ)
        const randomName = Math.random().toString(36).substring(2, 12);
        const filePath = `${Date.now()}_${randomName}.${fileExt}`;

        console.log(`[Storage] เริ่มอัปโหลดไฟล์ไปที่ Bucket: "${bucket}", Path: "${filePath}"`);

        // 4. อัปโหลดไปยัง Supabase
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('[Storage] รายละเอียด Error จาก Supabase:', uploadError);
            
            // แยกแยะ Error เพื่อให้แก้ปัญหาได้ตรงจุด
            if (uploadError.message.includes('bucket_not_found')) {
                throw new Error(`ไม่พบ Bucket ชื่อ "${bucket}" กรุณาไปสร้าง Bucket ในหน้า Storage ของ Supabase`);
            }
            if (uploadError.message.includes('Unauthorized') || (uploadError as any).status === 403 || (uploadError as any).status === 401) {
                throw new Error('สิทธิ์การเข้าถึงถูกปฏิเสธ (403/401): กรุณารัน SQL เพื่อตั้งค่า Storage Policies (RLS)');
            }
            throw new Error(`อัปโหลดล้มเหลว: ${uploadError.message}`);
        }

        // 5. ดึง Public URL (ต้องแน่ใจว่า Bucket ตั้งเป็น Public ไว้)
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        if (!publicUrl) {
            throw new Error('ไม่สามารถรับ Public URL ของไฟล์ได้');
        }

        console.log('[Storage] อัปโหลดสำเร็จ! URL ของคุณคือ:', publicUrl);
        return publicUrl;
    } catch (error: any) {
        console.error('[Storage] Exception:', error);
        throw error;
    }
};

/**
 * ดึง Path ของไฟล์จาก URL (ใช้สำหรับตอนสั่งลบไฟล์)
 */
export const extractStoragePath = (url: string | null | undefined, bucket: string = 'school-images'): string | null => {
    if (!url) return null;
    
    try {
        // รูปแบบ URL ทั่วไปของ Supabase: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        const storagePattern = `/storage/v1/object/public/${bucket}/`;
        const index = url.indexOf(storagePattern);
        
        if (index !== -1) {
            return url.substring(index + storagePattern.length);
        }
    } catch (e) {
        console.error('[Storage] Error extracting path:', e);
    }

    return null;
};

/**
 * ลบรูปภาพออกจาก Storage
 */
export const deleteStorageImage = async (url: string | null | undefined, bucket: string = 'school-images'): Promise<boolean> => {
    const filePath = extractStoragePath(url, bucket);
    
    if (!filePath) {
        console.warn('[Storage] ไม่สามารถระบุตำแหน่งไฟล์จาก URL ได้:', url);
        return false;
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.error('[Storage] ลบไฟล์ล้มเหลว:', error);
            return false;
        }
        console.log('[Storage] ลบไฟล์สำเร็จ:', filePath);
        return true;
    } catch (error) {
        console.error('[Storage] เกิดข้อผิดพลาดขณะลบไฟล์:', error);
        return false;
    }
};
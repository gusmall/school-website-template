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
        // 1. ตรวจสอบ Session ก่อน (สำคัญมาก)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error('User is not authenticated');
            throw new Error('กรุณาเข้าสู่ระบบก่อนทำการอัปโหลด');
        }

        // 2. จัดการเรื่องนามสกุลไฟล์และ Content Type
        let fileExt = 'webp';
        let contentType = 'image/webp';

        if (file instanceof File) {
            fileExt = file.name.split('.').pop() || 'webp';
            contentType = file.type;
        } else if (customFileName) {
            fileExt = customFileName.split('.').pop() || 'webp';
        }

        // 3. สร้างชื่อไฟล์แบบสุ่มเพื่อป้องกันชื่อซ้ำและปัญหาภาษาไทยในชื่อไฟล์
        const randomName = Math.random().toString(36).substring(2, 10);
        const filePath = `${Date.now()}_${randomName}.${fileExt}`;

        console.log(`[Storage] เริ่มอัปโหลดไฟล์: ${filePath} ไปยัง Bucket: ${bucket}`);

        // 4. อัปโหลดไปยัง Supabase
        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('[Storage] Supabase Upload Error:', uploadError);
            // ตรวจสอบ Error เฉพาะทาง
            if (uploadError.message.includes('bucket_not_found')) {
                throw new Error(`ไม่พบ Bucket ชื่อ "${bucket}" กรุณาตรวจสอบใน Supabase Dashboard`);
            }
            if (uploadError.message.includes('Unauthorized') || (uploadError as any).status === 403) {
                throw new Error('คุณไม่มีสิทธิ์อัปโหลดไฟล์ (Permission Denied) กรุณาตรวจสอบ RLS Policy');
            }
            throw new Error(`อัปโหลดล้มเหลว: ${uploadError.message}`);
        }

        // 5. ดึง Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        if (!publicUrl) {
            throw new Error('ไม่สามารถสร้าง URL สำหรับรูปภาพได้');
        }

        console.log('[Storage] อัปโหลดสำเร็จ! URL:', publicUrl);
        return publicUrl;
    } catch (error: any) {
        console.error('[Storage] Error in storageUtils:', error);
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
        console.error('Error extracting path:', e);
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
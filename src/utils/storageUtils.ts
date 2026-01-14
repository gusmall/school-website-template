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
        // 1. ตรวจสอบสถานะการเข้าสู่ระบบ (ยืนยันว่า Admin ล็อกอินอยู่)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('[Storage] Auth Error:', authError);
            throw new Error('กรุณาเข้าสู่ระบบใหม่ (Session อาจหมดอายุ) ก่อนทำการอัปโหลด');
        }

        console.log(`[Storage] ตรวจพบผู้ใช้: ${user.email}`);
        console.log(`[Storage] รายละเอียดไฟล์: size=${file.size}, type=${file.type}`);

        // 2. จัดการเรื่องนามสกุลไฟล์
        let fileExt = 'webp';
        let contentType = file.type || 'image/webp';

        if (file instanceof File) {
            fileExt = file.name.split('.').pop() || 'jpg';
        } else if (customFileName) {
            fileExt = customFileName.split('.').pop() || 'webp';
        }

        // 3. สร้างชื่อไฟล์แบบสุ่ม (ป้องกันชื่อไฟล์ภาษาไทย หรืออักขระพิเศษ)
        const randomId = Math.random().toString(36).substring(2, 12);
        const filePath = `${Date.now()}_${randomId}.${fileExt}`;

        console.log(`[Storage] กำลังส่งไปที่: Bucket("${bucket}"), Path("${filePath}")`);

        // 4. เริ่มอัปโหลด
        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('[Storage] Supabase Upload Error:', uploadError);
            
            // ตรวจสอบสาเหตุยอดฮิต
            if (uploadError.message.includes('bucket_not_found') || (uploadError as any).status === 404) {
                throw new Error(`ไม่พบ Bucket ชื่อ "${bucket}" กรุณาตรวจสอบชื่อในหน้า Storage ของ Supabase (ต้องตรงกันเป๊ะ)`);
            }
            if ((uploadError as any).status === 403 || (uploadError as any).status === 401) {
                throw new Error('สิทธิ์การอัปโหลดถูกปฏิเสธ (403): กรุณาตรวจสอบว่าคุณรัน SQL Policies (RLS) ครบถ้วนแล้ว');
            }
            throw new Error(`อัปโหลดล้มเหลว: ${uploadError.message}`);
        }

        // 5. รับ Public URL (Bucket ต้องตั้งค่าเป็น Public)
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        if (!publicUrl) {
            throw new Error('ไม่สามารถสร้างลิงก์สำหรับรูปภาพได้');
        }

        console.log('[Storage] อัปโหลดสำเร็จ!', publicUrl);
        return publicUrl;
    } catch (error: any) {
        console.error('[Storage] Exception:', error);
        throw error;
    }
};

/**
 * ดึง Path ของไฟล์จาก URL (สำหรับใช้ในการลบไฟล์)
 */
export const extractStoragePath = (url: string | null | undefined, bucket: string = 'school-images'): string | null => {
    if (!url) return null;
    
    try {
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
        console.warn('[Storage] ไม่พบ Path สำหรับลบ:', url);
        return false;
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.error('[Storage] ลบไฟล์ไม่สำเร็จ:', error);
            return false;
        }
        console.log('[Storage] ลบไฟล์ออกจากระบบแล้ว:', filePath);
        return true;
    } catch (error) {
        console.error('[Storage] เกิดข้อผิดพลาดขณะลบไฟล์:', error);
        return false;
    }
};
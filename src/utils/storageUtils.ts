import { supabase } from '@/integrations/supabase/client';

/**
 * ฟังก์ชันสำหรับอัปโหลดรูปภาพ (รองรับทั้ง File ปกติ และ Blob จากการบีบอัด)
 */
export const uploadImage = async (
    file: File | Blob, 
    customFileName?: string, 
    bucket: string = 'school-images'
) => {
    try {
        // 1. ตรวจสอบนามสกุลไฟล์และประเภทไฟล์ (MIME Type)
        let fileExt = 'webp';
        let contentType = 'image/webp';

        if (file instanceof File) {
            fileExt = file.name.split('.').pop() || 'webp';
            contentType = file.type;
        } else if (customFileName) {
            fileExt = customFileName.split('.').pop() || 'webp';
        }

        const randomName = Math.random().toString(36).substring(2, 10);
        const filePath = `${Date.now()}_${randomName}.${fileExt}`;

        console.log(`กำลังอัปโหลดไปที่ Bucket: ${bucket}, Path: ${filePath}`);

        // 2. อัปโหลดไฟล์ไปที่ Supabase
        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: contentType,
                upsert: true
            });

        if (uploadError) {
            // ถ้าเกิด Error bucketnotfound ให้ตรวจสอบชื่อ Bucket ใน Dashboard
            console.error('รายละเอียด Error การอัปโหลด:', uploadError);
            throw new Error(`อัปโหลดล้มเหลว: ${uploadError.message}`);
        }

        // 3. ดึง Public URL กลับมา
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error: any) {
        console.error('เกิดข้อผิดพลาดใน storageUtils:', error);
        throw error;
    }
};

/**
 * ดึง Path ของไฟล์จาก URL เพื่อใช้ในการลบ
 */
export const extractStoragePath = (url: string | null | undefined, bucket: string = 'school-images'): string | null => {
    if (!url) return null;
    
    // รูปแบบ URL ของ Supabase: .../storage/v1/object/public/<bucket>/<path>
    const storagePattern = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(storagePattern);
    
    if (index !== -1) {
        return url.substring(index + storagePattern.length);
    }

    return null;
};

/**
 * ลบรูปภาพออกจาก Storage
 */
export const deleteStorageImage = async (url: string | null | undefined, bucket: string = 'school-images'): Promise<boolean> => {
    const filePath = extractStoragePath(url, bucket);
    
    if (!filePath) {
        console.warn('ไม่พบ Path ใน URL หรือ URL ไม่ใช่ของ Storage นี้:', url);
        return false;
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.error('ลบไฟล์ไม่สำเร็จ:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('เกิดข้อผิดพลาดขณะลบไฟล์:', error);
        return false;
    }
};
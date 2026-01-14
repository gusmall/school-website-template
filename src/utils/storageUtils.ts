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
        // 1. ตรวจสอบว่ามีการส่งชื่อไฟล์มาไหม ถ้าไม่มีให้สร้างใหม่
        const fileExt = customFileName?.split('.').pop() || (file instanceof File ? file.name.split('.').pop() : 'webp');
        const randomName = Math.random().toString(36).substring(2, 10);
        const filePath = `${Date.now()}_${randomName}.${fileExt}`;

        // 2. อัปโหลดไฟล์ไปที่ Supabase
        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: `image/${fileExt === 'webp' ? 'webp' : 'jpeg'}`,
                upsert: true
            });

        if (uploadError) {
            console.error('Upload Error Details:', uploadError);
            throw uploadError;
        }

        // 3. ดึง Public URL กลับมา
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error in uploadImage utility:', error);
        throw error;
    }
};

/**
 * ดึง Path ของไฟล์จาก URL
 */
export const extractStoragePath = (url: string | null | undefined, bucket: string = 'school-images'): string | null => {
    if (!url) return null;
    const storagePattern = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(storagePattern);
    return index !== -1 ? url.substring(index + storagePattern.length) : null;
};

/**
 * ลบรูปภาพออกจาก Storage
 */
export const deleteStorageImage = async (url: string | null | undefined, bucket: string = 'school-images'): Promise<boolean> => {
    const filePath = extractStoragePath(url, bucket);
    if (!filePath) return false;

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};
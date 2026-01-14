

import { supabase } from '@/integrations/supabase/client';

/**
 * ฟังก์ชันสำหรับอัปโหลดรูปภาพ
 */
export const uploadImage = async (file: File, bucket: string = 'school-images') => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return publicUrl;
};

/**
 * ดึง Path ของไฟล์จาก URL (สำคัญ: ต้องใช้ bucket name ให้ตรงกัน)
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
        return !error;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};



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
        // 1. จัดการเรื่องนามสกุลไฟล์
        let fileExt = 'webp'; // ค่าเริ่มต้นถ้าเป็น Blob จากการบีบอัด
        let contentType = 'image/webp';

        if (file instanceof File) {
            fileExt = file.name.split('.').pop() || 'webp';
            contentType = file.type;
        } else if (customFileName) {
            fileExt = customFileName.split('.').pop() || 'webp';
        }

        // 2. สร้างชื่อไฟล์แบบสุ่มเพื่อป้องกันชื่อซ้ำ
        const randomName = Math.random().toString(36).substring(2, 10);
        const filePath = `${Date.now()}_${randomName}.${fileExt}`;

        console.log(`กำลังเริ่มอัปโหลดไปยัง Bucket: ${bucket}...`);

        // 3. อัปโหลดไปยัง Supabase
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: contentType,
                upsert: true
            });

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError);
            throw new Error(`ไม่สามารถอัปโหลดได้: ${uploadError.message}`);
        }

        // 4. ดึง Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        console.log('อัปโหลดสำเร็จ! URL:', publicUrl);
        return publicUrl;
    } catch (error: any) {
        console.error('Error in storageUtils:', error);
        throw error;
    }
};

/**
 * ดึง Path ของไฟล์จาก URL (ใช้สำหรับตอนสั่งลบไฟล์)
 */
export const extractStoragePath = (url: string | null | undefined, bucket: string = 'school-images'): string | null => {
    if (!url) return null;
    
    // รูปแบบ URL: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
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
        console.warn('ไม่สามารถระบุตำแหน่งไฟล์เพื่อลบได้:', url);
        return false;
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.error('ลบไฟล์ล้มเหลว:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('เกิดข้อผิดพลาดขณะลบไฟล์:', error);
        return false;
    }
};
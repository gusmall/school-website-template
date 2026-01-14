import { supabase } from '@/integrations/supabase/client';

/**
 * ฟังก์ชันสำหรับอัปโหลดรูปภาพไปยัง Supabase Storage
 * รองรับทั้ง File ปกติ และ Blob (ที่ได้จากการบีบอัดเป็น WebP)
 */
export const uploadImage = async (
    file: File | Blob, 
    customFileName?: string, 
    bucket: string = 'school-images'
) => {
    try {
        console.log(`[Storage] เริ่มต้นอัปโหลดไปยัง Bucket: "${bucket}"`);

        // 1. ตรวจสอบสถานะการเชื่อมต่อและสิทธิ์ (Auth Check)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('[Storage] Auth Error:', authError);
            throw new Error('ไม่พบข้อมูลการล็อกอิน: กรุณาลงชื่อเข้าสู่ระบบใหม่อีกครั้ง');
        }

        // 2. เตรียมข้อมูลไฟล์และ Path
        let fileExt = 'webp';
        let contentType = file.type || 'image/webp';

        if (file instanceof File) {
            fileExt = file.name.split('.').pop() || 'jpg';
        } else if (customFileName) {
            fileExt = customFileName.split('.').pop() || 'webp';
        }

        // สร้างชื่อไฟล์ใหม่เพื่อหลีกเลี่ยงชื่อซ้ำและปัญหาอักขระพิเศษ
        const randomId = Math.random().toString(36).substring(2, 12);
        const fileName = `${Date.now()}_${randomId}.${fileExt}`;

        console.log(`[Storage] ข้อมูลไฟล์: ${fileName} (${(file.size / 1024).toFixed(2)} KB)`);

        // 3. ดำเนินการอัปโหลด
        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('[Storage] รายละเอียด Error:', uploadError);
            
            // วิเคราะห์ Error เพื่อให้ผู้ใช้แก้ไขได้ถูกจุด
            const status = (uploadError as any).status;
            if (uploadError.message.includes('bucket_not_found') || status === 404) {
                throw new Error(`ไม่พบ Bucket "${bucket}": กรุณาตรวจสอบว่าชื่อ Bucket ใน Supabase ตรงกันและเป็น Public`);
            }
            if (status === 403 || status === 401 || uploadError.message.includes('row-level security')) {
                throw new Error('สิทธิ์ถูกปฏิเสธ (403): กรุณาตรวจสอบ SQL Policies ใน Supabase ว่าอนุญาตให้คุณอัปโหลดได้');
            }
            throw new Error(`ข้อผิดพลาดจาก Server (${status}): ${uploadError.message}`);
        }

        // 4. สร้าง Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        if (!publicUrl) {
            throw new Error('อัปโหลดสำเร็จแต่ไม่สามารถสร้าง URL สำหรับรูปภาพได้');
        }

        console.log('[Storage] อัปโหลดสำเร็จ!', publicUrl);
        return publicUrl;
    } catch (error: any) {
        console.error('[Storage] ตรวจพบข้อผิดพลาด:', error.message);
        throw error;
    }
};

/**
 * ดึง Path ของไฟล์จาก URL (ใช้สำหรับการลบ)
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
        console.error('[Storage] ไม่สามารถดึง Path จาก URL:', e);
    }

    return null;
};

/**
 * ลบรูปภาพออกจาก Storage
 */
export const deleteStorageImage = async (url: string | null | undefined, bucket: string = 'school-images'): Promise<boolean> => {
    const filePath = extractStoragePath(url, bucket);
    
    if (!filePath) {
        console.warn('[Storage] ไม่พบ Path ใน URL หรือ URL ไม่ถูกต้อง:', url);
        return false;
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.error('[Storage] ลบไฟล์ไม่สำเร็จ:', error);
            return false;
        }
        console.log('[Storage] ลบไฟล์เรียบร้อย:', filePath);
        return true;
    } catch (error) {
        console.error('[Storage] เกิดข้อผิดพลาดขณะลบ:', error);
        return false;
    }
};
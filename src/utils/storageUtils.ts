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
        console.log(`[Storage Debug] เริ่มต้นกระบวนการอัปโหลดไปที่ Bucket: "${bucket}"`);

        // 1. ตรวจสอบว่า Supabase Client พร้อมใช้งานหรือไม่
        if (!supabase) {
            throw new Error('Supabase client ไม่ได้ถูกระบุ หรือเชื่อมต่อไม่สำเร็จ');
        }

        // 2. ตรวจสอบสถานะการเข้าสู่ระบบ (Authentication Check)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('[Storage Debug] Auth Error:', authError);
            throw new Error('ไม่พบข้อมูลการเข้าสู่ระบบ: กรุณา Login ใหม่ที่หน้า Admin');
        }

        console.log(`[Storage Debug] ผู้ใช้ปัจจุบัน: ${user.email} (ID: ${user.id})`);

        // 3. เตรียมข้อมูลไฟล์
        let fileExt = 'webp';
        let contentType = file.type || 'image/webp';

        if (file instanceof File) {
            fileExt = file.name.split('.').pop() || 'jpg';
        } else if (customFileName) {
            fileExt = customFileName.split('.').pop() || 'webp';
        }

        // ป้องกันปัญหาภาษาไทยและอักขระพิเศษในชื่อไฟล์
        const randomId = Math.random().toString(36).substring(2, 12);
        const filePath = `${Date.now()}_${randomId}.${fileExt}`;

        console.log(`[Storage Debug] ข้อมูลไฟล์: Name="${filePath}", Type="${contentType}", Size=${(file.size / 1024).toFixed(2)} KB`);

        // 4. เริ่มอัปโหลดไปยัง Supabase Storage
        const { error: uploadError, data } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('[Storage Debug] อัปโหลดล้มเหลว! รายละเอียดจาก Server:', uploadError);
            
            // วิเคราะห์ Error เพื่อแจ้งเตือนให้ตรงจุด
            const status = (uploadError as any).status;
            if (uploadError.message.includes('bucket_not_found') || status === 404) {
                throw new Error(`ไม่พบ Bucket "${bucket}": กรุณาไปที่หน้า Storage ใน Supabase แล้วสร้าง Bucket ชื่อนี้ และตั้งเป็น Public`);
            }
            if (status === 403 || status === 401 || uploadError.message.includes('Unauthorized')) {
                throw new Error('สิทธิ์การอัปโหลดถูกปฏิเสธ (403): กรุณาตรวจสอบว่าคุณได้รัน SQL Policy เพื่ออนุญาตให้ Authenticated user อัปโหลดได้แล้ว');
            }
            throw new Error(`Server Error (${status || 'Unknown'}): ${uploadError.message}`);
        }

        console.log('[Storage Debug] อัปโหลดสำเร็จ!', data);

        // 5. ดึง Public URL (ต้องมั่นใจว่า Bucket ตั้งเป็น Public ไว้)
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        if (!publicUrl) {
            throw new Error('อัปโหลดไฟล์สำเร็จแต่ไม่สามารถสร้างลิงก์รูปภาพได้');
        }

        console.log('[Storage Debug] ลิงก์รูปภาพของคุณ:', publicUrl);
        return publicUrl;
    } catch (error: any) {
        console.error('[Storage Debug] ตรวจพบข้อผิดพลาด:', error);
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
        console.error('[Storage Debug] Error extracting path:', e);
    }

    return null;
};

/**
 * ลบรูปภาพออกจาก Storage
 */
export const deleteStorageImage = async (url: string | null | undefined, bucket: string = 'school-images'): Promise<boolean> => {
    const filePath = extractStoragePath(url, bucket);
    
    if (!filePath) {
        console.warn('[Storage Debug] ไม่พบ Path สำหรับลบจาก URL:', url);
        return false;
    }

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.error('[Storage Debug] ลบไฟล์ไม่สำเร็จ:', error);
            return false;
        }
        console.log('[Storage Debug] ลบไฟล์เรียบร้อย:', filePath);
        return true;
    } catch (error) {
        console.error('[Storage Debug] เกิดข้อผิดพลาดขณะลบไฟล์:', error);
        return false;
    }
};
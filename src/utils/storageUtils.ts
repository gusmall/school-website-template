วิธีแก้ไขปัญหา Error: storage/unauthorized

สาเหตุเกิดจาก Supabase Storage ยังไม่มีการตั้งค่า Policies เพื่ออนุญาตให้ผู้ใช้งาน (Admin) สามารถอัปโหลดไฟล์ลงใน Bucket ได้

ขั้นตอนการแก้ไข

เข้าไปที่ Supabase Dashboard ของโปรเจกต์คุณ

ไปที่เมนู SQL Editor ทางด้านซ้าย

คลิก New Query

คัดลอกโค้ด SQL ด้านล่างนี้ไปวางและกด Run

-- 1. สร้าง Bucket ชื่อ school-images (หากยังไม่มี)
insert into storage.buckets (id, name, public)
values ('school-images', 'school-images', true)
on conflict (id) do nothing;

-- 2. ตั้งค่าให้ทุกคนสามารถดูรูปภาพได้ (Public Access)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'school-images' );

-- 3. ตั้งค่าให้เฉพาะผู้ที่ Login แล้วเท่านั้นที่สามารถอัปโหลดรูปภาพได้
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'school-images' );

-- 4. ตั้งค่าให้เฉพาะผู้ที่ Login แล้วเท่านั้นที่สามารถแก้ไขรูปภาพได้
create policy "Authenticated users can update images"
on storage.objects for update
to authenticated
using ( bucket_id = 'school-images' );

-- 5. ตั้งค่าให้เฉพาะผู้ที่ Login แล้วเท่านั้นที่สามารถลบรูปภาพได้
create policy "Authenticated users can delete images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'school-images' );


คำอธิบายเพิ่มเติม

Public Access: อนุญาตให้หน้าเว็บแสดงผลรูปภาพได้โดยไม่ต้องใช้ Token

Authenticated users: ระบบจะตรวจสอบว่าคุณได้ Login เข้าหน้า Admin แล้วหรือยังก่อนจะอนุญาตให้อัปโหลด (ป้องกันคนแปลกหน้ามาอัปโหลดไฟล์ทับไฟล์เดิมของคุณ)

ตรวจสอบความถูกต้องของโค้ด (src/utils/storageUtils.ts)

เพื่อให้ระบบทำงานได้อย่างสมบูรณ์ คุณควรตรวจสอบให้แน่ใจว่าฟังก์ชันต่างๆ ใน src/utils/storageUtils.ts ใช้ชื่อ bucket ที่ตรงกับในฐานข้อมูล (ในที่นี้คือ school-images) ดังนี้:

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


หมายเหตุ: หากคุณใช้ชื่อ bucket อื่นที่ไม่ใช่ school-images ใน SQL คุณต้องมาเปลี่ยนค่า bucket: string = '...' ในโค้ดให้ตรงกันด้วยครับ
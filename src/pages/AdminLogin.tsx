import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Card';
import { Lock, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// แก้ไขเส้นทางการนำเข้าจาก alias (@/) เป็น relative path เพื่อป้องกันข้อผิดพลาดในการหาไฟล์
import { supabase } from '../integrations/supabase/client';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // เข้าสู่ระบบผ่าน Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      toast({
        title: 'เข้าสู่ระบบสำเร็จ',
        description: 'ยินดีต้อนรับเข้าสู่ระบบจัดการข้อมูลโรงเรียน',
      });
      
      // บันทึกสถานะการล็อกอินเบื้องต้น (สามารถใช้ร่วมกับ Auth state ของ Supabase ได้)
      sessionStorage.setItem('adminLoggedIn', 'true');
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        description: error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">วค</span>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">ระบบจัดการโรงเรียน</CardTitle>
          <CardDescription>กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมลผู้ใช้งาน</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-lg font-medium" disabled={isLoading}>
              {isLoading ? 'กำลังตรวจสอบข้อมูล...' : 'เข้าสู่ระบบ'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับสู่หน้าเว็บไซต์หลัก
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-center text-blue-700 leading-relaxed">
              <strong>คำแนะนำ:</strong> ใช้ที่อยู่อีเมลและรหัสผ่านที่คุณได้ลงทะเบียนไว้ในระบบ Supabase Authentication เพื่อเข้าจัดการเนื้อหา
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
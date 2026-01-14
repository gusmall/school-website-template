import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Demo login - ในระบบจริงต้องเชื่อมต่อกับ Backend
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        toast({
          title: 'เข้าสู่ระบบสำเร็จ',
          description: 'ยินดีต้อนรับเข้าสู่ระบบจัดการ',
        });
        navigate('/admin/dashboard');
      } else {
        toast({
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          description: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <span className="text-accent font-bold text-2xl">วค</span>
          </div>
          <CardTitle className="text-2xl text-primary">ระบบจัดการโรงเรียน</CardTitle>
          <CardDescription>กรุณาเข้าสู่ระบบเพื่อจัดการข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="กรอกชื่อผู้ใช้"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับสู่หน้าหลัก
            </button>
          </div>

          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <p className="text-xs text-center text-muted-foreground">
              <strong>Demo:</strong> ชื่อผู้ใช้: admin | รหัสผ่าน: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;

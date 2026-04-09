import { RequireAdmin } from '@/components/RequireAdmin';
import { Layout } from '@/components/Layout';
import { LocaleProvider } from '@/context/LocaleContext';
import { SessionProvider } from '@/context/SessionContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { InquiriesPage } from '@/pages/InquiriesPage';
import { InquiryDetailPage } from '@/pages/InquiryDetailPage';
import { LoginPage } from '@/pages/LoginPage';
import { NoticeFormPage } from '@/pages/NoticeFormPage';
import { NoticesPage } from '@/pages/NoticesPage';
import { OutfitDetailPage } from '@/pages/OutfitDetailPage';
import { OutfitsPage } from '@/pages/OutfitsPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { UserEditPage } from '@/pages/UserEditPage';
import { UsersPage } from '@/pages/UsersPage';
import { Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <SessionProvider>
      <LocaleProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route element={<RequireAdmin />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/users/:id/edit" element={<UserEditPage />} />
              <Route path="/outfits" element={<OutfitsPage />} />
              <Route path="/outfits/:id" element={<OutfitDetailPage />} />
              <Route path="/inquiries" element={<InquiriesPage />} />
              <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
              <Route path="/notices" element={<NoticesPage />} />
              <Route path="/notices/new" element={<NoticeFormPage />} />
              <Route path="/notices/:id/edit" element={<NoticeFormPage />} />
            </Route>
          </Route>
        </Routes>
      </LocaleProvider>
    </SessionProvider>
  );
}

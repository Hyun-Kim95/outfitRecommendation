import { RequireAdmin } from '@/components/RequireAdmin';
import { Layout } from '@/components/Layout';
import { SessionProvider } from '@/context/SessionContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { OutfitsPage } from '@/pages/OutfitsPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { UsersPage } from '@/pages/UsersPage';
import { Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route element={<RequireAdmin />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/outfits" element={<OutfitsPage />} />
          </Route>
        </Route>
      </Routes>
    </SessionProvider>
  );
}

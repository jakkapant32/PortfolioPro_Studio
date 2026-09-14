import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Icons from './components/Icons';
import LoginModal from './components/LoginModal';
import AdminLoginModal from './components/AdminLoginModal';
import ProfileModal from './components/ProfileModal';
import Analytics from './components/Analytics';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/admin/AdminLayout';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminPublicLayout from './components/admin/AdminPublicLayout';
import AdminLanding from './pages/admin/AdminLanding';
import Home from './pages/Home';
import PortfolioPage from './pages/PortfolioPage';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import ProductDetail from './pages/ProductDetail';
import PaymentReturn from './pages/PaymentReturn';
import FAQ from './pages/FAQ';
import Satisfaction from './pages/Satisfaction';
import MyProjects from './pages/MyProjects';
import MyOrders from './pages/MyOrders';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminWork from './pages/admin/AdminWork';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReports from './pages/admin/AdminReports';
import AdminContacts from './pages/admin/AdminContacts';
import AdminQuotations from './pages/admin/AdminQuotations';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPortfolio from './pages/admin/AdminPortfolio';
import AdminBlog from './pages/admin/AdminBlog';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSatisfaction from './pages/admin/AdminSatisfaction';

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Analytics />
            <Icons />
            <LoginModal />
            <AdminLoginModal />
            <ProfileModal />
            <Routes>
              <Route path="/admin/login" element={<Navigate to="/admin" replace />} />

              <Route element={<AdminPublicLayout />}>
                <Route path="/admin" element={<AdminLanding />} />
              </Route>

              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/portfolio/:slug" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/satisfaction" element={<Satisfaction />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/payment/return" element={<PaymentReturn />} />
                <Route path="/my-projects" element={<MyProjects />} />
                <Route path="/my-orders" element={<MyOrders />} />
              </Route>

              <Route path="/admin" element={<AdminProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="orders" element={<AdminWork />} />
                  <Route path="projects" element={<Navigate to="/admin/orders" replace />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="contacts" element={<AdminContacts />} />
                  <Route path="satisfaction" element={<AdminSatisfaction />} />
                  <Route path="quotations" element={<AdminQuotations />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="portfolio" element={<AdminPortfolio />} />
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

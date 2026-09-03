import { useEffect } from 'react';

import { Outlet, useLocation } from 'react-router-dom';

import Navbar from './Navbar';

import Footer from './Footer';

import CartDrawer from './CartDrawer';

import LineChatButton from './LineChatButton';



export default function PublicLayout() {

  const location = useLocation();

  const isHome = location.pathname === '/';



  useEffect(() => {

    document.documentElement.classList.add('public-site');

    return () => document.documentElement.classList.remove('public-site');

  }, []);



  useEffect(() => {

    if (isHome) {

      window.scrollTo(0, 0);

    }

  }, [isHome]);



  return (

    <div className="page-wrapper">

      <Navbar />

      <main className={`main-content${isHome ? ' main-content--home' : ''}`}>

        <Outlet />

      </main>

      <Footer />

      <CartDrawer />

      <LineChatButton />

    </div>

  );

}


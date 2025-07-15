import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiUsers, FiDollarSign, FiSettings, FiActivity, FiHome, FiCreditCard } from 'react-icons/fi';

// Admin Components
import AdminSidebar from './AdminSidebar';
import AdminOverview from './AdminOverview';
import UserManagement from './UserManagement';
import UserDetails from './UserDetails';
import TransactionManagement from './TransactionManagement';
import GameManagement from './GameManagement';
import PaymentSettings from './PaymentSettings';

const AdminContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  margin-left: ${props => props.sidebarOpen ? '250px' : '80px'};
  transition: margin-left 0.3s ease;
`;

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <AdminContainer>
      <AdminSidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <MainContent sidebarOpen={sidebarOpen}>
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/overview" element={<AdminOverview />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/users/:id" element={<UserDetails />} />
          <Route path="/transactions" element={<TransactionManagement />} />
          <Route path="/games" element={<GameManagement />} />
          <Route path="/payment-settings" element={<PaymentSettings />} />
          <Route path="*" element={<Navigate to="/admin/" replace />} />
        </Routes>
      </MainContent>
    </AdminContainer>
  );
};

export default AdminDashboard;
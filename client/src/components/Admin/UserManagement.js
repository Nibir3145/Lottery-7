import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiSearch, FiEye, FiEdit, FiDollarSign, FiUserCheck, FiUserX } from 'react-icons/fi';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 40px 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
`;

const FilterSelect = styled.select`
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: #f8f9fa;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e9ecef;
  
  &:hover {
    background: #f8f9fa;
  }
`;

const TableCell = styled.td`
  padding: 15px;
  font-size: 14px;
  color: #333;
`;

const TableHeaderCell = styled.th`
  padding: 15px;
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  text-align: left;
`;

const Status = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => props.active ? '#d4edda' : '#f8d7da'};
  color: ${props => props.active ? '#155724' : '#721c24'};
`;

const ActionButton = styled.button`
  padding: 6px 10px;
  margin: 0 2px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background: ${props => {
    switch(props.variant) {
      case 'view': return '#17a2b8';
      case 'edit': return '#ffc107';
      case 'wallet': return '#28a745';
      case 'activate': return '#007bff';
      case 'deactivate': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #e9ecef;
`;

const PageInfo = styled.div`
  font-size: 14px;
  color: #6c757d;
`;

const PageControls = styled.div`
  display: flex;
  gap: 10px;
`;

const PageButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #e9ecef;
  background: ${props => props.active ? '#007bff' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  
  &:hover:not(:disabled) {
    background: ${props => props.active ? '#0056b3' : '#f8f9fa'};
  }
  
  &:disabled {
    background: #e9ecef;
    color: #6c757d;
    cursor: not-allowed;
  }
`;

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, pagination.current]);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await axios.get(`/api/admin/users?${params}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
    fetchUsers(page);
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await axios.put(`/api/admin/users/${userId}/status`, { isActive: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers(pagination.current);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleViewUser = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  if (loading && users.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <Header>
        <Title>User Management</Title>
      </Header>

      <Controls>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search by username, email, or phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <SearchIcon />
        </SearchContainer>
        
        <FilterSelect
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
      </Controls>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Balance</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div>
                    <div style={{ fontWeight: '600' }}>{user.username}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      ID: {user._id.slice(-8)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{user.email}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {user.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ fontWeight: '600' }}>
                    ₹{user.balance.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Deposited: ₹{user.totalDeposited.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <Status active={user.isActive}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Status>
                </TableCell>
                <TableCell>
                  <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <ActionButton
                      variant="view"
                      onClick={() => handleViewUser(user._id)}
                      title="View Details"
                    >
                      <FiEye />
                    </ActionButton>
                    <ActionButton
                      variant="wallet"
                      onClick={() => navigate(`/admin/users/${user._id}?tab=wallet`)}
                      title="Manage Wallet"
                    >
                      <FiDollarSign />
                    </ActionButton>
                    <ActionButton
                      variant={user.isActive ? 'deactivate' : 'activate'}
                      onClick={() => handleStatusToggle(user._id, user.isActive)}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <FiUserX /> : <FiUserCheck />}
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>

        <Pagination>
          <PageInfo>
            Showing {users.length} users
          </PageInfo>
          <PageControls>
            <PageButton
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={!pagination.hasPrev}
            >
              Previous
            </PageButton>
            
            {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
              const page = i + 1;
              return (
                <PageButton
                  key={page}
                  active={page === pagination.current}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </PageButton>
              );
            })}
            
            <PageButton
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={!pagination.hasNext}
            >
              Next
            </PageButton>
          </PageControls>
        </Pagination>
      </Card>
    </Container>
  );
};

export default UserManagement;
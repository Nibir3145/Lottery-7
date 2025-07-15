import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit, FiDollarSign, FiCreditCard, FiActivity, FiUser } from 'react-icons/fi';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #5a6268;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #333;
`;

const TabContainer = styled.div`
  margin-bottom: 30px;
`;

const TabNav = styled.div`
  display: flex;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 12px 20px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.active ? '#007bff' : '#6c757d'};
  border-bottom: 2px solid ${props => props.active ? '#007bff' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: #007bff;
  }
`;

const TabContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const UserInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const InfoCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const InfoLabel = styled.div`
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  margin-bottom: 5px;
`;

const InfoValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const FormSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 15px;
  color: #333;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-right: 10px;
  
  &:hover {
    background: ${props => props.variant === 'danger' ? '#c82333' : '#0056b3'};
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const ActivityList = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  padding: 15px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const ActivityInfo = styled.div`
  flex: 1;
`;

const ActivityAction = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
`;

const ActivityDetails = styled.div`
  font-size: 12px;
  color: #6c757d;
`;

const ActivityTime = styled.div`
  font-size: 12px;
  color: #6c757d;
  text-align: right;
`;

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState(null);
  
  // Balance update form
  const [balanceForm, setBalanceForm] = useState({
    amount: '',
    type: 'add',
    notes: ''
  });
  
  // Payment config form
  const [paymentForm, setPaymentForm] = useState({
    upiId: '',
    qrCodeUrl: '',
    qrCodeData: '',
    isActive: true
  });

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/users/${id}`);
      setUser(response.data.user);
      setActivity(response.data.activity);
      
      // Initialize payment form with existing data
      if (response.data.user.adminPaymentConfig) {
        setPaymentForm({
          upiId: response.data.user.adminPaymentConfig.upiId || '',
          qrCodeUrl: response.data.user.adminPaymentConfig.qrCodeUrl || '',
          qrCodeData: response.data.user.adminPaymentConfig.qrCodeData || '',
          isActive: response.data.user.adminPaymentConfig.isActive !== false
        });
      }
    } catch (error) {
      toast.error('Failed to fetch user details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceUpdate = async (e) => {
    e.preventDefault();
    
    if (!balanceForm.amount || balanceForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await axios.put(`/api/admin/users/${id}/balance`, balanceForm);
      toast.success('Balance updated successfully');
      setBalanceForm({ amount: '', type: 'add', notes: '' });
      fetchUserDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update balance');
    }
  };

  const handlePaymentConfigUpdate = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`/api/admin/users/${id}/payment-config`, paymentForm);
      toast.success('Payment configuration updated successfully');
      fetchUserDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment configuration');
    }
  };

  const handleStatusToggle = async () => {
    try {
      const newStatus = !user.isActive;
      await axios.put(`/api/admin/users/${id}/status`, { isActive: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUserDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/admin/users')}>
          <FiArrowLeft />
          Back to Users
        </BackButton>
        <Title>{user.username} - User Details</Title>
      </Header>

      <UserInfo>
        <InfoCard>
          <InfoLabel>Username</InfoLabel>
          <InfoValue>{user.username}</InfoValue>
        </InfoCard>
        <InfoCard>
          <InfoLabel>Email</InfoLabel>
          <InfoValue>{user.email}</InfoValue>
        </InfoCard>
        <InfoCard>
          <InfoLabel>Balance</InfoLabel>
          <InfoValue>₹{user.balance.toFixed(2)}</InfoValue>
        </InfoCard>
        <InfoCard>
          <InfoLabel>Status</InfoLabel>
          <InfoValue style={{ color: user.isActive ? '#28a745' : '#dc3545' }}>
            {user.isActive ? 'Active' : 'Inactive'}
          </InfoValue>
        </InfoCard>
      </UserInfo>

      <TabContainer>
        <TabNav>
          <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            <FiUser /> Overview
          </Tab>
          <Tab active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')}>
            <FiDollarSign /> Wallet Management
          </Tab>
          <Tab active={activeTab === 'payment'} onClick={() => setActiveTab('payment')}>
            <FiCreditCard /> Payment Settings
          </Tab>
          <Tab active={activeTab === 'activity'} onClick={() => setActiveTab('activity')}>
            <FiActivity /> Activity Log
          </Tab>
        </TabNav>

        <TabContent>
          {activeTab === 'overview' && (
            <div>
              <FormSection>
                <SectionTitle>User Information</SectionTitle>
                <UserInfo>
                  <InfoCard>
                    <InfoLabel>Phone</InfoLabel>
                    <InfoValue>{user.phone}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel>Referral Code</InfoLabel>
                    <InfoValue>{user.referralCode}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel>Total Deposited</InfoLabel>
                    <InfoValue>₹{user.totalDeposited.toFixed(2)}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel>Total Withdrawn</InfoLabel>
                    <InfoValue>₹{user.totalWithdrawn.toFixed(2)}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel>Total Winnings</InfoLabel>
                    <InfoValue>₹{user.totalWinnings.toFixed(2)}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel>Total Losses</InfoLabel>
                    <InfoValue>₹{user.totalLosses.toFixed(2)}</InfoValue>
                  </InfoCard>
                </UserInfo>
              </FormSection>

              <FormSection>
                <SectionTitle>Account Actions</SectionTitle>
                <Button 
                  variant={user.isActive ? 'danger' : 'primary'}
                  onClick={handleStatusToggle}
                >
                  {user.isActive ? 'Deactivate Account' : 'Activate Account'}
                </Button>
              </FormSection>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div>
              <FormSection>
                <SectionTitle>Update User Balance</SectionTitle>
                <form onSubmit={handleBalanceUpdate}>
                  <FormGroup>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={balanceForm.amount}
                      onChange={(e) => setBalanceForm({...balanceForm, amount: e.target.value})}
                      placeholder="Enter amount"
                      required
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>Type</Label>
                    <Select
                      value={balanceForm.type}
                      onChange={(e) => setBalanceForm({...balanceForm, type: e.target.value})}
                    >
                      <option value="add">Add to Balance</option>
                      <option value="subtract">Subtract from Balance</option>
                      <option value="set">Set Balance</option>
                    </Select>
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>Notes (Optional)</Label>
                    <TextArea
                      value={balanceForm.notes}
                      onChange={(e) => setBalanceForm({...balanceForm, notes: e.target.value})}
                      placeholder="Reason for balance update..."
                    />
                  </FormGroup>
                  
                  <Button type="submit">Update Balance</Button>
                </form>
              </FormSection>

              <FormSection>
                <SectionTitle>Recent Transactions</SectionTitle>
                <ActivityList>
                  {activity?.transactions?.map((transaction, index) => (
                    <ActivityItem key={index}>
                      <ActivityInfo>
                        <ActivityAction>{transaction.type.toUpperCase()}</ActivityAction>
                        <ActivityDetails>
                          Amount: ₹{transaction.amount} | Status: {transaction.status}
                          <br />
                          Reference: {transaction.reference}
                        </ActivityDetails>
                      </ActivityInfo>
                      <ActivityTime>
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </ActivityTime>
                    </ActivityItem>
                  ))}
                </ActivityList>
              </FormSection>
            </div>
          )}

          {activeTab === 'payment' && (
            <div>
              <FormSection>
                <SectionTitle>Payment Configuration</SectionTitle>
                <form onSubmit={handlePaymentConfigUpdate}>
                  <FormGroup>
                    <Label>UPI ID</Label>
                    <Input
                      type="text"
                      value={paymentForm.upiId}
                      onChange={(e) => setPaymentForm({...paymentForm, upiId: e.target.value})}
                      placeholder="Enter UPI ID (e.g., user@paytm)"
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>QR Code URL</Label>
                    <Input
                      type="url"
                      value={paymentForm.qrCodeUrl}
                      onChange={(e) => setPaymentForm({...paymentForm, qrCodeUrl: e.target.value})}
                      placeholder="Enter QR code image URL"
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>QR Code Data</Label>
                    <TextArea
                      value={paymentForm.qrCodeData}
                      onChange={(e) => setPaymentForm({...paymentForm, qrCodeData: e.target.value})}
                      placeholder="Enter QR code payment data or UPI link"
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label>
                      <input
                        type="checkbox"
                        checked={paymentForm.isActive}
                        onChange={(e) => setPaymentForm({...paymentForm, isActive: e.target.checked})}
                        style={{ marginRight: '8px' }}
                      />
                      Payment configuration is active
                    </Label>
                  </FormGroup>
                  
                  <Button type="submit">Update Payment Configuration</Button>
                </form>
              </FormSection>

              <FormSection>
                <SectionTitle>Current Configuration</SectionTitle>
                {user.adminPaymentConfig ? (
                  <div>
                    <p><strong>UPI ID:</strong> {user.adminPaymentConfig.upiId || 'Not set'}</p>
                    <p><strong>QR Code URL:</strong> {user.adminPaymentConfig.qrCodeUrl || 'Not set'}</p>
                    <p><strong>Status:</strong> {user.adminPaymentConfig.isActive ? 'Active' : 'Inactive'}</p>
                    <p><strong>Last Updated:</strong> {new Date(user.adminPaymentConfig.updatedAt).toLocaleString()}</p>
                  </div>
                ) : (
                  <p>No payment configuration set</p>
                )}
              </FormSection>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <FormSection>
                <SectionTitle>Login History</SectionTitle>
                <ActivityList>
                  {activity?.loginHistory?.map((login, index) => (
                    <ActivityItem key={index}>
                      <ActivityInfo>
                        <ActivityAction>Login</ActivityAction>
                        <ActivityDetails>
                          IP: {login.ipAddress}
                          <br />
                          User Agent: {login.userAgent}
                        </ActivityDetails>
                      </ActivityInfo>
                      <ActivityTime>
                        {new Date(login.timestamp).toLocaleString()}
                      </ActivityTime>
                    </ActivityItem>
                  ))}
                </ActivityList>
              </FormSection>

              <FormSection>
                <SectionTitle>Activity Log</SectionTitle>
                <ActivityList>
                  {activity?.activityLog?.map((log, index) => (
                    <ActivityItem key={index}>
                      <ActivityInfo>
                        <ActivityAction>{log.action.replace(/_/g, ' ').toUpperCase()}</ActivityAction>
                        <ActivityDetails>
                          {log.details && typeof log.details === 'object' ? 
                            Object.entries(log.details).map(([key, value]) => (
                              <span key={key}>{key}: {String(value)} | </span>
                            )) :
                            log.details
                          }
                          <br />
                          IP: {log.ipAddress}
                        </ActivityDetails>
                      </ActivityInfo>
                      <ActivityTime>
                        {new Date(log.timestamp).toLocaleString()}
                      </ActivityTime>
                    </ActivityItem>
                  ))}
                </ActivityList>
              </FormSection>
            </div>
          )}
        </TabContent>
      </TabContainer>
    </Container>
  );
};

export default UserDetails;
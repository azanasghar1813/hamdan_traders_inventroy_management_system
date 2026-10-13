import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiUserCheck, FiUserX, FiEye, FiEyeOff } from 'react-icons/fi';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    isActive: true
  });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user = null) => {
    setFormError('');
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Password empty on edit unless changing
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'STAFF', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      if (editingUser) {
        // Only send password if it's filled
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        
        await api.put(`/users/${editingUser._id}`, payload);
      } else {
        if (!formData.password) {
          return setFormError('Password is required for new users');
        }
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'An error occurred saving the user');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to completely delete the user "${name}"?`)) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting user');
      }
    }
  };

  const toggleStatus = async (user) => {
    const nextStatus = !user.isActive;
    setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: nextStatus } : u));
    try {
      await api.put(`/users/${user._id}`, { isActive: nextStatus });
    } catch (err) {
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !nextStatus } : u));
      alert(err.response?.data?.message || 'Error updating user status');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors"
        >
          <FiPlus className="mr-2" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 responsive-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/4"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/4"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2 float-right"></div></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td data-label="Name" className="px-6 py-4 whitespace-nowrap text-left">
                    <div className="flex items-center justify-start">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3 text-left">
                        <button
                          type="button"
                          onClick={() => setSelectedUserDetails(user)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block text-left"
                          title="Click to view user details"
                        >
                          {user.name}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td data-label="Email" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td data-label="Role" className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button
                      type="button"
                      onClick={() => toggleStatus(user)}
                      className="inline-flex items-center gap-2 group cursor-pointer focus:outline-none"
                      title={`Click to switch to ${user.isActive ? 'Inactive' : 'Active'}`}
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          user.isActive ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            user.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                        user.isActive ? 'bg-green-100 text-green-800 group-hover:bg-green-200' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openModal(user)} className="text-blue-600 hover:text-blue-900 mr-4" title="Edit User">
                      <FiEdit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(user._id, user.name)} className="text-red-600 hover:text-red-900" title="Delete User">
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border-l-4 border-red-500">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser && <span className="text-xs text-gray-500 font-normal">(Leave blank to keep unchanged)</span>}
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10" 
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="STAFF">Staff (Basic Access)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* User Details Modal */}
      {selectedUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">User Profile</h3>
              <button 
                onClick={() => setSelectedUserDetails(null)} 
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                  {selectedUserDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedUserDetails.name}</h4>
                  <p className="text-sm text-gray-500">{selectedUserDetails.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      selectedUserDetails.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUserDetails.role}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      selectedUserDetails.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedUserDetails.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Account ID:</span>
                  <span className="font-mono text-xs text-gray-700">{selectedUserDetails._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">System Role:</span>
                  <span className="font-medium text-gray-900">
                    {selectedUserDetails.role === 'ADMIN' ? 'Full Administrator' : 'Staff Member'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${selectedUserDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedUserDetails.isActive ? 'Active Account' : 'Disabled Account'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const u = selectedUserDetails;
                    setSelectedUserDetails(null);
                    openModal(u);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Edit User
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserDetails(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

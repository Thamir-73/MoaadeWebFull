'use client';
import { useState, useEffect, useCallback, memo } from 'react';
import { FaCreditCard, FaPlus, FaUniversity, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import { saveBankDetails, fetchBankDetails, removeBankDetails } from '@/app/utils/firebase';

// Separate form component with local state
const BankForm = memo(({ onSubmit, initialData, isLoading, error, text, isEditing, onClose, isRTL }) => {
  const [localFormData, setLocalFormData] = useState({
    accountHolderName: initialData?.accountHolderName || '',
    bankName: initialData?.bankName || '',
    iban: initialData?.iban || ''
  });

  const handleLocalChange = (e) => {
    const { name, value } = e.target;
    setLocalFormData(prev => ({
      ...prev,
      [name]: name === 'iban' ? value.toUpperCase() : value
    }));
  };

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    onSubmit(localFormData);
  };

  return (
    <form onSubmit={handleLocalSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {text.accountHolderName}
        </label>
        <input
          type="text"
          name="accountHolderName"
          value={localFormData.accountHolderName}
          onChange={handleLocalChange}
          placeholder="Example Trading Co. / شركة المثال التجارية"
          className="w-full border rounded-md px-3 py-2 text-left"
          dir="ltr"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {text.bankName}
        </label>
        <input
          type="text"
          name="bankName"
          value={localFormData.bankName}
          onChange={handleLocalChange}
          placeholder={text.bankNamePlaceholder}
          className="w-full border rounded-md px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {text.iban}
        </label>
        <input
          type="text"
          name="iban"
          value={localFormData.iban}
          onChange={handleLocalChange}
          placeholder="SA0000000000000000000000"
          className="w-full border rounded-md px-3 py-2 font-mono"
          dir="ltr"
          required
          pattern="SA[0-9]{22}"
          maxLength={24}
        />
      </div>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
      >
        {isLoading ? text.saving : (isEditing ? text.updateAccount : text.saveAccount)}
      </button>
    </form>
  );
});

BankForm.displayName = 'BankForm';
  
export default function PaymentMethodsTab({ userType, text, isRTL, userId }) {
    const [showAddMethod, setShowAddMethod] = useState(false);
    const [bankDetails, setBankDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [lastFetch, setLastFetch] = useState(null);
  
    // Only fetch if data is stale (older than 5 minutes) or doesn't exist
    const loadBankDetails = async () => {
      const now = Date.now();
      if (!bankDetails || !lastFetch || (now - lastFetch) > 300000) { // 5 minutes
        try {
          const details = await fetchBankDetails(userId);
          setBankDetails(details);
          setLastFetch(now);
        } catch (error) {
          console.error('Error loading bank details:', error);
        }
      }
    };
  
    useEffect(() => {
      if (userId) {
        loadBankDetails();
      }
    }, [userId]);
  
    // Better delete confirmation modal
 // In the DeleteConfirmModal component
const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <h3 className="text-xl font-semibold mb-4">{text.confirmDelete}</h3>
        <p className="text-gray-600 mb-6">{text.deleteAccountWarning}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            {text.cancel}
          </button>
          <button
            onClick={async () => {
              try {
                console.log('Attempting to delete bank details...');
                await removeBankDetails(userId);
                console.log('Bank details deleted successfully');
                setBankDetails(null);
                setLastFetch(null);
                setShowDeleteConfirm(false);
              } catch (error) {
                console.error('Error in delete operation:', error);
                setError(text.errorDeletingAccount);
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            {text.delete}
          </button>
        </div>
        {error && (
          <p className="text-red-500 mt-4 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
  
    const handleFormSubmit = async (formData) => {
      setIsLoading(true);
      setError(null);
      try {
        await saveBankDetails(userId, formData);
        const details = await fetchBankDetails(userId);
        setBankDetails(details);
        setLastFetch(Date.now());
        setShowAddMethod(false);
        setIsEditing(false);
      } catch (error) {
        setError(text.errorSavingAccount);
      } finally {
        setIsLoading(false);
      }
    };
  
    // Factory UI - Card Payment View (Coming Soon)
  // Factory UI - Card Payment View (Coming Soon)
const FactoryPaymentUI = () => (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{text.paymentMethods}</h2>
      </div>
  
      <div className="text-center py-12">
        <div className="bg-blue-50 rounded-xl p-8 max-w-md mx-auto">
          <FaCreditCard className="mx-auto text-blue-500 text-6xl mb-6" />
          <h3 className="text-xl font-semibold mb-3">{text.noPaymentMethods}</h3>
          <p className="text-gray-600 mb-6">
            {text.setupCardDesc}
          </p>
          <button
            onClick={() => setShowAddMethod(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center mx-auto"
          >
            <FaPlus className={isRTL ? 'ml-2' : 'mr-2'} />
            <span>{text.addPaymentMethod}</span>
          </button>
        </div>
      </div>
  
      {/* Add/Edit Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{text.addNewCard}</h3>
              <button 
                onClick={() => setShowAddMethod(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="text-center text-gray-500 py-8">
              Coming Soon
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
    // Company UI - Bank Account View
    const CompanyPaymentUI = () => (
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{text.paymentMethods}</h2>
        </div>
  
        {bankDetails ? (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-lg mb-1">{bankDetails.accountHolderName}</h3>
                <p className="text-gray-600">{bankDetails.bankName}</p>
                <p className="text-gray-600 font-mono mt-2">
                  {bankDetails.iban.replace(/(.{4})/g, '$1 ')}
                </p>
              </div>
              <div className="flex space-x-0">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowAddMethod(true);
                  }}
                  className="text-blue-500 pl-3 hover:text-blue-600"
                >
                  <FaEdit size={20} />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-500 hover:text-red-600"
                >
                  <FaTrash size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-green-50 rounded-xl p-8 max-w-md mx-auto">
              <FaUniversity className="mx-auto text-green-500 text-6xl mb-6" />
              <h3 className="text-xl font-semibold mb-3">{text.noPaymentMethods}</h3>
              <p className="text-gray-600 mb-6">
                {text.setupBankDesc}
              </p>
              <button
                onClick={() => {
                  setShowAddMethod(true);
                }}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center mx-auto"
              >
                <FaPlus className={isRTL ? 'ml-2' : 'mr-2'} />
                <span>{text.addBankAccount}</span>
              </button>
            </div>
          </div>
        )}
  
        {/* Add/Edit Modal */}
        {showAddMethod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {isEditing ? text.editBankAccount : text.addNewAccount}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddMethod(false);
                    setIsEditing(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <BankForm
                initialData={isEditing ? bankDetails : null}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                error={error}
                text={text}
                isEditing={isEditing}
                onClose={() => {
                  setShowAddMethod(false);
                  setIsEditing(false);
                }}
                isRTL={isRTL}
              />
            </div>
          </div>
        )}
      </div>
    );
  
    return (
      <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="flex flex-col min-h-[calc(100vh-12rem)] bg-white rounded-lg shadow-md p-6">
          {userType === 'factory' ? <FactoryPaymentUI /> : <CompanyPaymentUI />}
        </div>
        {showDeleteConfirm && <DeleteConfirmModal />}
      </div>
    );
  }
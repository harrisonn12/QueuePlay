import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { PencilIcon } from '@heroicons/react/24/solid';

export const AccountSection = () => {
    const { user } = useAuth0();
    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState('');

    const text = {
        accountInformationSection: 'Account Information',
        accountInformationDescription:
            'Your personal account details and preferences.',
        accountSettingsSection: 'Account Settings',
        changePasswordButton: 'Change Password',
        updateProfilePictureButton: 'Update Profile Picture',
        saveButton: 'Save',
        cancelButton: 'Cancel',
    };

    const handleEdit = (field, value) => {
        setEditingField(field);
        setEditValue(value);
    };

    const handleSave = async (field) => {
        // TODO: Implement API call to update user information
        console.log(`Saving ${field}: ${editValue}`);
        setEditingField(null);
    };

    const handleCancel = () => {
        setEditingField(null);
        setEditValue('');
    };

    const renderField = (label, value, field) => {
        const isEditing = editingField === field;

        return (
            <div className='bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                <dt className='text-sm font-medium text-gray-500'>{label}</dt>
                <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center justify-between'>
                    {isEditing ? (
                        <div className='flex-1 flex items-center space-x-2'>
                            <input
                                type='text'
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className='flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
                            />
                            <button
                                onClick={() => handleSave(field)}
                                className='inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            >
                                {text.saveButton}
                            </button>
                            <button
                                onClick={handleCancel}
                                className='inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            >
                                {text.cancelButton}
                            </button>
                        </div>
                    ) : (
                        <div className='flex-1 flex items-center justify-between'>
                            <span>{value}</span>
                            <button
                                onClick={() => handleEdit(field, value)}
                                className='ml-4 inline-flex items-center p-1 border border-transparent rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            >
                                <PencilIcon className='h-5 w-5' />
                            </button>
                        </div>
                    )}
                </dd>
            </div>
        );
    };

    return (
        <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    {text.accountInformationSection}
                </h3>
                <p className='mt-1 max-w-2xl text-sm text-gray-500'>
                    {text.accountInformationDescription}
                </p>
            </div>
            <div className='border-t border-gray-200'>
                <dl>
                    {renderField('Full name', user?.name, 'name')}
                    {renderField('Email address', user?.email, 'email')}
                    {renderField(
                        'Account created',
                        new Date(user?.updated_at).toLocaleDateString(),
                        'created'
                    )}
                </dl>
            </div>
            <div className='px-4 py-5 sm:px-6'>
                <h3 className='text-lg leading-6 font-medium text-gray-900 mt-6'>
                    {text.accountSettingsSection}
                </h3>
                <div className='mt-4 space-y-4'>
                    <button className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'>
                        {text.changePasswordButton}
                    </button>
                    <button className='ml-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'>
                        {text.changePasswordButton}
                    </button>
                </div>
            </div>
        </div>
    );
};

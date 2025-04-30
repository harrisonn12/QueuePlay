import { useState } from 'react';
import { CouponsTable } from '../../features/CouponsTable';

export const CouponsSection = () => {
    const [coupons, setCoupons] = useState([
        {
            id: 1,
            code: 'SUMMER',
            discount: '10%',
            quantity: 100,
            remaining: 68,
            expiry: '2024-12-31',
            status: 'Active',
        },
        {
            id: 2,
            code: 'WELCOME20',
            discount: '20%',
            quantity: 50,
            remaining: 12,
            expiry: '2024-08-31',
            status: 'Active',
        },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        type: '',
        quantity: 1,
        discount: '',
    });

    const handleCreateCoupons = (e) => {
        e.preventDefault();
        // Here you would typically make an API call to create the coupons
        console.log('Creating coupons:', newCoupon);
        setIsModalOpen(false);
        setNewCoupon({ type: '', quantity: 1, discount: '' });
    };

    return (
        <div className='bg-white shadow rounded-lg p-6'>
            <div className='flex justify-between items-center mb-6'>
                <h2 className='text-2xl font-bold text-gray-900'>Coupons</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className='bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700'
                >
                    Create Coupons
                </button>
            </div>

            {/* Create Coupons Modal */}
            {isModalOpen && (
                <div className='fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50'>
                    <div className='bg-white rounded-lg p-6 max-w-md w-full shadow-xl'>
                        <h3 className='text-lg font-medium text-gray-900 mb-4'>
                            Create New Coupons
                        </h3>
                        <form onSubmit={handleCreateCoupons}>
                            <div className='mb-4'>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Coupon Type
                                </label>
                                <input
                                    type='text'
                                    value={newCoupon.type}
                                    onChange={(e) =>
                                        setNewCoupon({
                                            ...newCoupon,
                                            type: e.target.value,
                                        })
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-md'
                                    placeholder='e.g., SUMMER, WELCOME, HOLIDAY'
                                    required
                                />
                            </div>
                            <div className='mb-4'>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Number of Coupons
                                </label>
                                <input
                                    type='number'
                                    value={newCoupon.quantity}
                                    onChange={(e) =>
                                        setNewCoupon({
                                            ...newCoupon,
                                            quantity: parseInt(e.target.value),
                                        })
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-md'
                                    min='1'
                                    required
                                />
                            </div>
                            <div className='mb-4'>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Discount Amount
                                </label>
                                <div className='flex'>
                                    <input
                                        type='number'
                                        value={newCoupon.discount}
                                        onChange={(e) =>
                                            setNewCoupon({
                                                ...newCoupon,
                                                discount: e.target.value,
                                            })
                                        }
                                        className='w-full px-3 py-2 border border-gray-300 rounded-l-md'
                                        placeholder='e.g., 10'
                                        required
                                    />
                                    <select
                                        className='border border-gray-300 rounded-r-md px-3 py-2 bg-gray-50'
                                        onChange={(e) =>
                                            setNewCoupon({
                                                ...newCoupon,
                                                discount: `${newCoupon.discount}${e.target.value}`,
                                            })
                                        }
                                    >
                                        <option value='%'>%</option>
                                        <option value='$'>$</option>
                                    </select>
                                </div>
                            </div>
                            <div className='flex justify-end space-x-3'>
                                <button
                                    type='button'
                                    onClick={() => setIsModalOpen(false)}
                                    className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='submit'
                                    className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700'
                                >
                                    Create Coupons
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <CouponsTable coupons={coupons} />
        </div>
    );
};

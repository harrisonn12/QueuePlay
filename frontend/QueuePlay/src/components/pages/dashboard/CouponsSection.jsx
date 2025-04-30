import { useState } from 'react';

export const CouponsSection = () => {
    const [coupons, setCoupons] = useState([
        {
            id: 1,
            code: 'WELCOME10',
            discount: '10%',
            expiry: '2024-12-31',
            status: 'Active',
        },
        {
            id: 2,
            code: 'SUMMER20',
            discount: '20%',
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

            <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                        <tr>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Code
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Discount
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Expiry Date
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Status
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className='bg-white divide-y divide-gray-200'>
                        {coupons.map((coupon) => (
                            <tr key={coupon.id}>
                                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                                    {coupon.code}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                    {coupon.discount}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                    {coupon.expiry}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                    <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            coupon.status === 'Active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {coupon.status}
                                    </span>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                    <button className='text-indigo-600 hover:text-indigo-900 mr-3'>
                                        Edit
                                    </button>
                                    <button className='text-red-600 hover:text-red-900'>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

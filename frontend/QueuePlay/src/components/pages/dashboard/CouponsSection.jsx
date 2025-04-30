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

    return (
        <div className='bg-white shadow rounded-lg p-6'>
            <div className='flex justify-between items-center mb-6'>
                <h2 className='text-2xl font-bold text-gray-900'>Coupons</h2>
                <button className='bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700'>
                    Add New Coupon
                </button>
            </div>

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

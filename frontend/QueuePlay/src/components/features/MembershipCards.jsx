import { UserMembershipTierContext } from '../../context/UserMembershipTierContext';
import { useContext } from 'react';

export const MembershipCards = ({ tier, name, price, perks }) => {
    const userMembershipTier = useContext(UserMembershipTierContext);

    return (
        <div
            className={`rounded-lg shadow-md transition-all duration-200 ${
                tier === userMembershipTier
                    ? 'border-2 border-indigo-500 bg-indigo-50'
                    : 'border border-gray-200'
            }`}
        >
            <div className='p-6'>
                <div className='flex items-center justify-between'>
                    <h3 className='text-xl font-semibold text-gray-900'>
                        {name}
                    </h3>
                    <div className='flex items-baseline'>
                        <span className='text-3xl font-bold text-gray-900'>
                            ${price}
                        </span>
                        <span className='ml-1 text-sm font-medium text-gray-600'>
                            /month
                        </span>
                    </div>
                </div>

                <div className='mt-6 space-y-4'>
                    {perks.length ? (
                        perks.map((perk, index) => (
                            <div key={index} className='flex items-start'>
                                <div className='flex-shrink-0'>
                                    <svg
                                        className='h-5 w-5 text-indigo-500'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth='2'
                                            d='M5 13l4 4L19 7'
                                        />
                                    </svg>
                                </div>
                                <p className='ml-3 text-sm font-medium text-gray-800'>
                                    {perk}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className='flex items-center space-x-2 py-2'>
                            <div className='animate-pulse h-4 w-4 bg-indigo-200 rounded-full'></div>
                            <div className='animate-pulse h-4 w-24 bg-indigo-100 rounded'></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

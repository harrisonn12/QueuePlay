export const MembershipCards = ({ name, price, perks }) => {
    return (
        <div className='px-6 py-4 transition-colors duration-300 transform rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800'>
            <p className='text-lg font-medium text-gray-800 dark:text-gray-100'>
                {name}
            </p>

            <h4 className='mt-2 text-3xl font-semibold text-gray-800 dark:text-gray-100'>
                {`$${price} `}
                <span className='text-base font-normal text-gray-600 dark:text-gray-400'>
                    / Month
                </span>
            </h4>

            {/* <p className='mt-4 text-gray-500 dark:text-gray-300'>
                For most businesses that want to optimaize web queries.
            </p> */}

            {perks.length ? (
                perks.map((perk) => (
                    <div className='mt-8 space-y-8' key={perk}>
                        <div className='flex items-center'>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='w-5 h-5 text-blue-500'
                                viewBox='0 0 20 20'
                                fill='currentColor'
                            >
                                <path
                                    fill-rule='evenodd'
                                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                    clip-rule='evenodd'
                                />
                            </svg>

                            <span className='mx-4 text-gray-700 dark:text-gray-300'>
                                {perk}
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <div>Loading perks...</div>
            )}
        </div>
    );
};

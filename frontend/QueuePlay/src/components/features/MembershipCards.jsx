export const MembershipCards = ({ cardData }) => {
    console.log(cardData);

    return (
        <>
            <div class='px-6 py-4 transition-colors duration-300 transform rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800'>
                <p class='text-lg font-medium text-gray-800 dark:text-gray-100'>
                    Intro
                </p>

                <h4 class='mt-2 text-3xl font-semibold text-gray-800 dark:text-gray-100'>
                    $19{' '}
                    <span class='text-base font-normal text-gray-600 dark:text-gray-400'>
                        / Month
                    </span>
                </h4>

                <p class='mt-4 text-gray-500 dark:text-gray-300'>
                    For most businesses that want to optimaize web queries.
                </p>

                <div class='mt-8 space-y-8'>
                    <div class='flex items-center'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            class='w-5 h-5 text-blue-500'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                        >
                            <path
                                fill-rule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                clip-rule='evenodd'
                            />
                        </svg>

                        <span class='mx-4 text-gray-700 dark:text-gray-300'>
                            All limited links
                        </span>
                    </div>

                    <div class='flex items-center'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            class='w-5 h-5 text-blue-500'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                        >
                            <path
                                fill-rule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                clip-rule='evenodd'
                            />
                        </svg>

                        <span class='mx-4 text-gray-700 dark:text-gray-300'>
                            Own analytics platform
                        </span>
                    </div>

                    <div class='flex items-center'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            class='w-5 h-5 text-blue-500'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                        >
                            <path
                                fill-rule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                clip-rule='evenodd'
                            />
                        </svg>

                        <span class='mx-4 text-gray-700 dark:text-gray-300'>
                            Chat support
                        </span>
                    </div>

                    <div class='flex items-center'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            class='w-5 h-5 text-blue-500'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                        >
                            <path
                                fill-rule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                clip-rule='evenodd'
                            />
                        </svg>

                        <span class='mx-4 text-gray-700 dark:text-gray-300'>
                            Optimize hashtags
                        </span>
                    </div>

                    <div class='flex items-center'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            class='w-5 h-5 text-blue-500'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                        >
                            <path
                                fill-rule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                clip-rule='evenodd'
                            />
                        </svg>

                        <span class='mx-4 text-gray-700 dark:text-gray-300'>
                            Unlimited users
                        </span>
                    </div>
                </div>

                <button class='w-full px-4 py-2 mt-10 font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600'>
                    Choose plan
                </button>
            </div>
        </>
    );
};

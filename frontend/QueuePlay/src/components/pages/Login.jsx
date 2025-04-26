import { LoginButton } from '../LoginButton';

export const Login = () => {
    return (
        <div className='min-h-screen bg-gray-100 flex flex-col items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8'>
            <div className='w-full max-w-md space-y-6 sm:space-y-8'>
                {/* Logo Placeholder */}
                <div className='flex justify-center'>
                    <div className='h-20 w-20 sm:h-24 sm:w-24 bg-indigo-600 rounded-lg flex items-center justify-center transform transition-transform hover:scale-105'>
                        <span className='text-white text-xl sm:text-2xl font-bold'>
                            QP
                        </span>
                    </div>
                </div>

                {/* Welcome Text */}
                <div className='text-center'>
                    <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-900'>
                        Welcome to QueuePlay
                    </h2>
                    <p className='mt-2 text-sm sm:text-base text-gray-600'>
                        Your ultimate gaming companion
                    </p>
                </div>

                {/* Login Button */}
                <div className='flex justify-center mt-6 sm:mt-8'>
                    <LoginButton />
                </div>
            </div>
        </div>
    );
};

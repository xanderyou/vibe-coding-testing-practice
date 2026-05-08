import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoginPage } from '../../pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';
import * as AuthContext from '../../context/AuthContext';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(AuthContext.useAuth);

describe('LoginPage 測試案例', () => {
    let mockLogin: ReturnType<typeof vi.fn>;
    let mockClearAuthExpiredMessage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLogin = vi.fn();
        mockClearAuthExpiredMessage = vi.fn();

        mockUseAuth.mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: mockClearAuthExpiredMessage,
            logout: vi.fn(),
            checkAuth: vi.fn(),
        });

        // 預設給一個 API URL，避免顯示測試帳號提示
        vi.stubEnv('VITE_API_URL', 'http://test.api');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );
    };

    describe('【前端元素】', () => {
        it('應該正確渲染登入表單元素', () => {
            renderComponent();
            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
        });

        it('提交表單時，應該顯示載入中狀態並禁用表單', async () => {
            mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件000');
            const passwordInput = screen.getByLabelText('密碼');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'test1234' } });
            fireEvent.click(submitBtn);

            expect(submitBtn).toHaveTextContent('登入中...');
            expect(submitBtn).toBeDisabled();
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();

            await waitFor(() => {
                expect(submitBtn).not.toHaveTextContent('登入中...');
            });
        });
    });

    describe('【表單驗證】', () => {
        it('輸入無效的電子郵件格式時，應該顯示錯誤訊息', () => {
            renderComponent();
            const emailInput = screen.getByLabelText('電子郵件');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.click(submitBtn);

            expect(screen.getByText('請輸入有效的 Email 格式')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('輸入長度不足 8 個字元的密碼時，應該顯示錯誤訊息', () => {
            renderComponent();
            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: '1234567' } });
            fireEvent.click(submitBtn);

            expect(screen.getByText('密碼必須至少 8 個字元')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('輸入不含英文字母或數字的密碼時，應該顯示錯誤訊息', () => {
            renderComponent();
            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'abcdefgh' } });
            fireEvent.click(submitBtn);

            expect(screen.getByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('再次送出表單時，應該先清除前一次的 API 錯誤訊息', async () => {
            mockLogin.mockRejectedValueOnce({ response: { data: { message: '帳號或密碼錯誤' } } });
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'test1234' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('帳號或密碼錯誤')).toBeInTheDocument();
            });

            // 再次送出時，錯誤訊息應該被清除
            mockLogin.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.queryByText('帳號或密碼錯誤')).not.toBeInTheDocument();
            });
        });
    });

    describe('【Mock API】', () => {
        it('輸入正確的帳號密碼時，應該成功登入並導向至 /dashboard', async () => {
            mockLogin.mockResolvedValue(undefined);
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'test1234' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'test1234');
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });

        it('登入失敗時，應該顯示 API 回傳的錯誤訊息', async () => {
            mockLogin.mockRejectedValue({ response: { data: { message: '帳號或密碼錯誤' } } });
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitBtn = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'test1234' } });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('帳號或密碼錯誤')).toBeInTheDocument();
            });
        });
    });

    describe('【路由導向】', () => {
        it('若使用者已登入，造訪登入頁應該自動導向至 /dashboard', () => {
            mockUseAuth.mockReturnValue({
                login: mockLogin,
                isAuthenticated: true,
                user: null,
                token: 'fake-token',
                isLoading: false,
                authExpiredMessage: '',
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
                logout: vi.fn(),
                checkAuth: vi.fn(),
            });
            renderComponent();
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
    });

    describe('【AuthContext 狀態】', () => {
        it('若有登入過期訊息，應該顯示該訊息並清除狀態', () => {
            mockUseAuth.mockReturnValue({
                login: mockLogin,
                isAuthenticated: false,
                user: null,
                token: null,
                isLoading: false,
                authExpiredMessage: '登入狀態已過期',
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
                logout: vi.fn(),
                checkAuth: vi.fn(),
            });
            renderComponent();
            expect(screen.getByText('登入狀態已過期')).toBeInTheDocument();
            expect(mockClearAuthExpiredMessage).toHaveBeenCalled();
        });
    });

    describe('【環境變數】', () => {
        it('當沒有 VITE_API_URL 時，應該顯示測試帳號提示', () => {
            vi.stubEnv('VITE_API_URL', '');
            renderComponent();
            expect(screen.getByText('測試帳號：任意 email 格式 / 密碼需包含英數且8位以上')).toBeInTheDocument();
        });
    });
});

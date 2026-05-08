import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardPage } from '../../pages/DashboardPage';
import { BrowserRouter } from 'react-router-dom';
import * as AuthContext from '../../context/AuthContext';
import { productApi } from '../../api/productApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../api/productApi', () => ({
    productApi: {
        getProducts: vi.fn(),
    }
}));

const mockUseAuth = vi.mocked(AuthContext.useAuth);
const mockGetProducts = vi.mocked(productApi.getProducts);

describe('DashboardPage 測試案例', () => {
    let mockLogout: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLogout = vi.fn();
        
        mockUseAuth.mockReturnValue({
            login: vi.fn(),
            isAuthenticated: true,
            user: { id: 1, email: 'test@example.com', username: 'TestUser', role: 'admin' },
            token: 'fake-token',
            isLoading: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn(),
        });

        // 預設為成功回傳空陣列
        mockGetProducts.mockResolvedValue([]);
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <DashboardPage />
            </BrowserRouter>
        );
    };

    describe('【前端元素】', () => {
        it('應該正確渲染儀表板標題與登出按鈕', () => {
            renderComponent();
            expect(screen.getByRole('heading', { name: '儀表板' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
        });

        it('當使用者角色為 admin 時，應該顯示管理後台連結', () => {
            renderComponent();
            expect(screen.getByText('🛠️ 管理後台')).toBeInTheDocument();
        });

        it('當使用者角色不為 admin 時，不應該顯示管理後台連結', () => {
            mockUseAuth.mockReturnValue({
                ...mockUseAuth(),
                user: { id: 1, email: 'test@example.com', username: 'User', role: 'user' },
            });
            renderComponent();
            expect(screen.queryByText('🛠️ 管理後台')).not.toBeInTheDocument();
        });

        it('應該正確顯示使用者名稱與角色標籤', () => {
            renderComponent();
            expect(screen.getByText('Welcome, TestUser 👋')).toBeInTheDocument();
            expect(screen.getByText('管理員')).toBeInTheDocument();
        });
    });

    describe('【Mock API】', () => {
        it('初始載入時，應該顯示載入中狀態', () => {
            // 延遲 Promise 解析以測試載入中狀態
            let resolvePromise: (value: any[]) => void;
            mockGetProducts.mockImplementation(() => new Promise((resolve) => {
                resolvePromise = resolve;
            }));
            
            renderComponent();
            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
            
            // Clean up the promise
            resolvePromise!([]);
        });

        it('成功從 API 取得資料後，應該正確渲染商品列表', async () => {
            mockGetProducts.mockResolvedValue([
                { id: 1, name: '測試商品', price: 100, description: '這是一個測試商品' }
            ]);
            renderComponent();
            
            await waitFor(() => {
                expect(screen.getByText('測試商品')).toBeInTheDocument();
            });
            expect(screen.getByText('這是一個測試商品')).toBeInTheDocument();
            expect(screen.getByText('NT$ 100')).toBeInTheDocument();
        });

        it('API 回傳錯誤且狀態碼不為 401 時，應該顯示錯誤訊息', async () => {
            mockGetProducts.mockRejectedValue({
                response: { status: 500, data: { message: '伺服器錯誤' } }
            });
            renderComponent();
            
            await waitFor(() => {
                expect(screen.getByText('伺服器錯誤')).toBeInTheDocument();
            });
        });
    });

    describe('【路由導向】', () => {
        it('點擊登出按鈕時，應該呼叫 logout 並導向至 /login', async () => {
            renderComponent();
            
            const logoutBtn = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutBtn);
            
            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});

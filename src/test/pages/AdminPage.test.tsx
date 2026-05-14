import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPage } from '../../pages/AdminPage';
import { BrowserRouter } from 'react-router-dom';
import * as AuthContext from '../../context/AuthContext';

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

const mockUseAuth = vi.mocked(AuthContext.useAuth);

describe('AdminPage 測試案例', () => {
    let mockLogout: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLogout = vi.fn();
        
        mockUseAuth.mockReturnValue({
            login: vi.fn(),
            isAuthenticated: true,
            user: { username: 'Admin', role: 'admin' },
            token: 'fake-token',
            isLoading: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
            logout: mockLogout as any,
            checkAuth: vi.fn(),
        });
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <AdminPage />
            </BrowserRouter>
        );
    };

    describe('【前端元素】', () => {
        it('應該正確渲染管理後台標題與返回連結', () => {
            renderComponent();
            expect(screen.getByRole('heading', { name: '🛠️ 管理後台' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: '← 返回' })).toBeInTheDocument();
        });

        it('應該正確顯示使用者的角色標籤', () => {
            renderComponent();
            expect(screen.getByText('管理員')).toBeInTheDocument();
        });
    });

    describe('【路由導向】', () => {
        it('點擊登出按鈕時，應該呼叫 logout 並導向至 /login', () => {
            renderComponent();
            
            const logoutBtn = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutBtn);
            
            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});

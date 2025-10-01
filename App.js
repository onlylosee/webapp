import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Wallet, TrendingUp, Users, RefreshCw, ArrowUp, ArrowDown,
  DollarSign, Clock, Award, Activity, BarChart3, CheckCircle, AlertCircle
} from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://your-api.vercel.app/api'; // ЗАМЕНИТЕ НА ВАШ URL

const App = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();

          const userId = tg.initDataUnsafe?.user?.id || 652017464;
          await loadUserData(userId);
        } else {
          await loadUserData(652017464);
        }
      } catch (err) {
        setError('Ошибка инициализации');
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const loadUserData = async (userId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
        timeout: 15000
      });

      if (response.data.success) {
        setUserData(response.data.data);
      } else {
        throw new Error(response.data.error);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const collectProfit = async () => {
    if (!userData || userData.current_profit <= 0) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/user/${userData.user_id}/collect-profit`);

      if (response.data.success) {
        await loadUserData(userData.user_id);
        showNotification('success', `Собрано ${formatCurrency(response.data.amount)}!`);
      } else {
        showNotification('error', response.data.error);
      }
    } catch (err) {
      showNotification('error', 'Ошибка сбора прибыли');
    }
  };

  const createDeposit = async (amount) => {
    if (!userData || amount < 10) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/user/${userData.user_id}/deposit`, {
        amount: parseFloat(amount)
      });

      if (response.data.success) {
        await loadUserData(userData.user_id);
        showNotification('success', `Депозит ${formatCurrency(amount)} создан!`);
      } else {
        showNotification('error', response.data.error);
      }
    } catch (err) {
      showNotification('error', 'Ошибка создания депозита');
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw size={40} />
        </motion.div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="error-container">
        <AlertCircle size={64} />
        <h2>Ошибка подключения</h2>
        <p>{error}</p>
        <button onClick={() => loadUserData(652017464)}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`notification ${notification.type}`}
          >
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="header">
        <h1>TON STOCKER</h1>
        <button onClick={() => loadUserData(userData.user_id)}>
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Balance */}
      <div className="balance-section">
        <div className="balance-amount">
          {formatCurrency(userData.balance)}
        </div>
        <p>Доступный баланс</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <BarChart3 size={24} />
          <div>
            <p>Инвестировано</p>
            <span>{formatCurrency(userData.total_invested)}</span>
          </div>
        </div>

        <div className="stat-card">
          <DollarSign size={24} />
          <div>
            <p>Заработано</p>
            <span>{formatCurrency(userData.total_earned)}</span>
          </div>
        </div>

        <div className="stat-card">
          <Activity size={24} />
          <div>
            <p>Депозиты</p>
            <span>{userData.deposits_count}</span>
          </div>
        </div>

        <div className="stat-card">
          <Users size={24} />
          <div>
            <p>Рефералы</p>
            <span>{userData.referrals.total}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button
          className="action-btn collect"
          onClick={collectProfit}
          disabled={userData.current_profit <= 0}
        >
          <TrendingUp size={20} />
          Собрать {formatCurrency(userData.current_profit)}
        </button>

                <button
          className="action-btn invest"
          onClick={() => {
            const amount = prompt('Сумма депозита (мин. $10):');
            if (amount && parseFloat(amount) >= 10) {
              createDeposit(amount);
            }
          }}
        >
          <Wallet size={20} />
          Инвестировать
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'dashboard', icon: BarChart3, label: 'Обзор' },
          { id: 'deposits', icon: Wallet, label: 'Депозиты' },
          { id: 'transactions', icon: Activity, label: 'История' },
          { id: 'referrals', icon: Users, label: 'Рефералы' }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="profit-card">
              <h3>Доступная прибыль</h3>
              <div className="profit-amount">
                {formatCurrency(userData.current_profit)}
              </div>
              {userData.current_profit > 0 && (
                <button onClick={collectProfit} className="collect-btn">
                  Собрать прибыль
                </button>
              )}
            </div>

            <div className="overview-stats">
              <div className="overview-item">
                <span>ROI за все время:</span>
                <span className="value">
                  {userData.total_invested > 0
                    ? `+${((userData.total_earned / userData.total_invested) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="overview-item">
                <span>Статус аккаунта:</span>
                <span className="value active">Активен</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deposits' && (
          <div className="deposits">
            {userData.deposits.length > 0 ? (
              userData.deposits.map((deposit, index) => (
                <div key={deposit.id} className="deposit-card">
                  <div className="deposit-header">
                    <span className="amount">{formatCurrency(deposit.amount)}</span>
                    <span className={`plan ${deposit.plan_type.toLowerCase()}`}>
                      {deposit.plan_type}
                    </span>
                  </div>
                  <div className="deposit-details">
                    <div><Clock size={16} /> Создан: {new Date(deposit.start_date).toLocaleDateString()}</div>
                    <div><TrendingUp size={16} /> Доходность: {(deposit.daily_rate * 100).toFixed(1)}% в день</div>
                    <div><DollarSign size={16} /> Доступно: {formatCurrency(deposit.available_profit)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Wallet size={64} />
                <h3>Нет активных депозитов</h3>
                <p>Создайте первый депозит и начните зарабатывать</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions">
            <h3>Последние транзакции</h3>
            {userData.recent_transactions.length > 0 ? (
              userData.recent_transactions.map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-icon">
                    {tx.type === 'deposit' ? <ArrowDown /> :
                     tx.type === 'withdraw' ? <ArrowUp /> :
                     tx.type === 'profit' ? <TrendingUp /> :
                     <Award />}
                  </div>
                  <div className="tx-info">
                    <div className="tx-type">
                      {tx.type === 'deposit' ? 'Пополнение' :
                       tx.type === 'withdraw' ? 'Вывод' :
                       tx.type === 'profit' ? 'Прибыль' : 'Бонус'}
                    </div>
                    <div className="tx-description">{tx.description}</div>
                    <div className="tx-date">
                      {new Date(tx.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Activity size={64} />
                <h3>Нет транзакций</h3>
                <p>История операций будет здесь</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="referrals">
            <div className="referral-link">
              <h3>Ваша реферальная ссылка</h3>
              <div className="link-container">
                <input
                  type="text"
                  value={`https://t.me/your_bot_username?start=${userData.referral_code}`}
                  readOnly
                />
                <button onClick={() => {
                  navigator.clipboard.writeText(`https://t.me/your_bot_username?start=${userData.referral_code}`);
                  showNotification('success', 'Ссылка скопирована!');
                }}>
                  Копировать
                </button>
              </div>
            </div>

            <div className="referral-stats">
              <div className="ref-level">
                <span>1 уровень (10%)</span>
                <span>{userData.referrals.level1}</span>
              </div>
              <div className="ref-level">
                <span>2 уровень (5%)</span>
                <span>{userData.referrals.level2}</span>
              </div>
              <div className="ref-level">
                <span>3 уровень (2%)</span>
                <span>{userData.referrals.level3}</span>
              </div>
              <div className="ref-total">
                <span>Всего заработано</span>
                <span>{formatCurrency(userData.referral_earnings)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;


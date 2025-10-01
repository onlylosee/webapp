const { useState, useEffect } = React;

// ВАЖНО: Замените на ваш реальный URL от Vercel!
const API_BASE_URL = 'https://server-3hznro02y-onlylosees-projects.vercel.app/api';

const App = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Анимационные состояния
  const [showBalance, setShowBalance] = useState(true);
  const [balanceAnimation, setBalanceAnimation] = useState(0);

  useEffect(() => {
    const initApp = async () => {
      try {
        let userId = 652017464; // Fallback для тестирования

        // Инициализация Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();
          tg.setBackgroundColor('#0a0a0a');
          tg.setHeaderColor('#0a0a0a');

          // Получаем ID пользователя из Telegram
          userId = tg.initDataUnsafe?.user?.id || 652017464;

          console.log('Telegram WebApp initialized for user:', userId);
        }

        await loadUserData(userId);

        // Автообновление каждые 30 секунд
        const interval = setInterval(() => {
          if (!refreshing) {
            loadUserData(userId);
          }
        }, 30000);

        return () => clearInterval(interval);

      } catch (err) {
        console.error('App init error:', err);
        setError('Ошибка инициализации приложения');
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Анимация баланса при изменении
  useEffect(() => {
    if (userData) {
      setBalanceAnimation(prev => prev + 1);
    }
  }, [userData?.balance]);

  const loadUserData = async (userId) => {
    try {
      if (!refreshing) setRefreshing(true);

      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setUserData(response.data.data);
        setError(null);

        // Вибрация при успешной загрузке
        if (window.Telegram?.WebApp?.HapticFeedback && refreshing) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      } else {
        throw new Error(response.data.error || 'API Error');
      }
    } catch (err) {
      console.error('Load user data error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Ошибка подключения к серверу';
      setError(errorMsg);

      if (!userData) {
        setUserData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const collectProfit = async () => {
    if (!userData || userData.current_profit <= 0) {
      showNotification('error', 'Нет доступной прибыли для сбора');
      return;
    }

    try {
      showNotification('info', 'Собираем прибыль...');

      const response = await axios.post(`${API_BASE_URL}/user/${userData.user_id}/collect-profit`, {}, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        const amount = response.data.amount;
        await loadUserData(userData.user_id);
        showNotification('success', `🎉 Собрано ${formatCurrency(amount)}!`);

        // Вибрация успеха
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        showNotification('error', response.data.error || 'Ошибка сбора прибыли');
      }
    } catch (err) {
      showNotification('error', 'Ошибка сбора прибыли');
      console.error('Collect profit error:', err);
    }
  };

  const createDeposit = () => {
    const amount = prompt('💰 Введите сумму депозита:\n(Минимум $10)');

    if (!amount) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 10) {
      showNotification('error', 'Минимальная сумма депозита $10');
      return;
    }

    if (depositAmount > userData.balance) {
      showNotification('error', 'Недостаточно средств на балансе');
      return;
    }

    processDeposit(depositAmount);
  };

  const processDeposit = async (amount) => {
    try {
      showNotification('info', 'Создаем депозит...');

      const response = await axios.post(`${API_BASE_URL}/user/${userData.user_id}/deposit`, {
        amount: amount
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        await loadUserData(userData.user_id);
        const planInfo = getPlanInfo(amount);
        showNotification('success',
          `🚀 Депозит ${formatCurrency(amount)} создан!\nПлан: ${planInfo.name} (${planInfo.rate}% в день)`
        );

        // Вибрация успеха
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        showNotification('error', response.data.error || 'Ошибка создания депозита');
      }
    } catch (err) {
      showNotification('error', 'Ошибка создания депозита');
      console.error('Create deposit error:', err);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);

    // Тактильная обратная связь
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (type === 'success') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } else if (type === 'error') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanInfo = (amount) => {
    if (amount >= 50000) return { name: 'VIP', rate: 6.5, emoji: '👑', color: 'vip' };
    if (amount >= 15000) return { name: 'Premium', rate: 5.5, emoji: '💰', color: 'premium' };
    if (amount >= 5000) return { name: 'Professional', rate: 4.5, emoji: '🚀', color: 'professional' };
    if (amount >= 1000) return { name: 'Basic', rate: 3.5, emoji: '💎', color: 'basic' };
    return { name: 'Starter', rate: 2.5, emoji: '🌱', color: 'starter' };
  };

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: '💰',
      withdraw: '💸',
      profit: '📈',
      referral: '🎁',
      bonus: '🏆'
    };
    return icons[type] || '💵';
  };

  const getTransactionTitle = (type) => {
    const titles = {
      deposit: 'Пополнение',
      withdraw: 'Вывод',
      profit: 'Прибыль',
      referral: 'Реферальный бонус',
      bonus: 'Бонус'
    };
    return titles[type] || 'Операция';
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showNotification('success', '📋 Скопировано в буфер обмена');
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('success', '📋 Скопировано в буфер обмена');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      showNotification('error', 'Ошибка копирования');
    }
  };

  // Loading screen
  if (loading && !userData) {
    return React.createElement('div', { className: 'loading-container' },
      React.createElement('div', { className: 'loading-content' },
        React.createElement('div', { className: 'loading-logo' }, '🚀'),
        React.createElement('div', { className: 'loading-spinner' }),
        React.createElement('h2', null, 'TON STOCKER'),
        React.createElement('p', null, 'Загрузка вашего портфеля...')
      )
    );
  }

  // Error screen
  if (error && !userData) {
    return React.createElement('div', { className: 'error-container' },
      React.createElement('div', { className: 'error-content' },
        React.createElement('div', { className: 'error-icon' }, '⚠️'),
        React.createElement('h2', null, 'Ошибка подключения'),
        React.createElement('p', { className: 'error-message' }, error),
        React.createElement('button', {
          onClick: () => {
            setError(null);
            setLoading(true);
            loadUserData(652017464);
          },
          className: 'retry-button'
        }, '🔄 Повторить попытку')
      )
    );
  }

  return React.createElement('div', { className: 'app' },

    // Notification
    notification && React.createElement('div', {
      className: `notification ${notification.type}`,
      style: {
        animation: 'slideInDown 0.3s ease-out',
        zIndex: 9999
      }
    },
      React.createElement('div', { className: 'notification-content' },
        React.createElement('span', null, notification.message)
      )
    ),

    // Header with balance
    React.createElement('header', { className: 'app-header' },
      React.createElement('div', { className: 'header-top' },
        React.createElement('div', { className: 'header-left' },
          React.createElement('h1', { className: 'app-title' }, 'TON STOCKER'),
          React.createElement('span', { className: 'app-subtitle' }, 'AI Investment Platform')
        ),
        React.createElement('button', {
          className: 'refresh-btn',
          onClick: () => loadUserData(userData.user_id),
          disabled: refreshing
        }, refreshing ? '⏳' : '🔄')
      ),

      React.createElement('div', { className: 'balance-card' },
        React.createElement('div', { className: 'balance-header' },
          React.createElement('span', null, 'Доступный баланс'),
          React.createElement('button', {
            className: 'balance-toggle',
            onClick: () => setShowBalance(!showBalance)
          }, showBalance ? '👁️' : '🙈')
        ),
        React.createElement('div', {
          className: 'balance-amount',
          key: balanceAnimation,
          style: { animation: 'balanceGlow 0.5s ease-out' }
        }, showBalance ? formatCurrency(userData.balance) : '****'),

        userData.current_profit > 0.01 && React.createElement('div', { className: 'profit-indicator' },
          React.createElement('span', { className: 'profit-icon' }, '⚡'),
          React.createElement('span', null, `+${formatCurrency(userData.current_profit)} готово к сбору`)
        )
      )
    ),

    // Quick actions
    React.createElement('section', { className: 'quick-actions' },
      React.createElement('button', {
        className: `action-btn collect-btn ${userData.current_profit <= 0.01 ? 'disabled' : ''}`,
        onClick: collectProfit,
        disabled: userData.current_profit <= 0.01
      },
        React.createElement('div', { className: 'btn-icon' }, '📈'),
        React.createElement('div', { className: 'btn-content' },
          React.createElement('span', { className: 'btn-title' }, 'Собрать прибыль'),
          React.createElement('span', { className: 'btn-amount' }, formatCurrency(userData.current_profit))
        )
      ),

      React.createElement('button', {
        className: 'action-btn invest-btn',
        onClick: createDeposit
      },
        React.createElement('div', { className: 'btn-icon' }, '💎'),
        React.createElement('div', { className: 'btn-content' },
          React.createElement('span', { className: 'btn-title' }, 'Новый депозит'),
          React.createElement('span', { className: 'btn-subtitle' }, 'от $10')
        )
      )
    ),

    // Stats grid
    React.createElement('section', { className: 'stats-section' },
      React.createElement('h3', { className: 'section-title' }, '📊 Ваша статистика'),
      React.createElement('div', { className: 'stats-grid' },
        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-icon invested' }, '📈'),
          React.createElement('div', { className: 'stat-info' },
            React.createElement('span', { className: 'stat-label' }, 'Инвестировано'),
            React.createElement('span', { className: 'stat-value' }, formatCurrency(userData.total_invested))
          )
        ),

        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-icon earned' }, '💰'),
          React.createElement('div', { className: 'stat-info' },
            React.createElement('span', { className: 'stat-label' }, 'Заработано'),
            React.createElement('span', { className: 'stat-value' }, formatCurrency(userData.total_earned))
          )
        ),

        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-icon deposits' }, '💎'),
          React.createElement('div', { className: 'stat-info' },
            React.createElement('span', { className: 'stat-label' }, 'Депозиты'),
            React.createElement('span', { className: 'stat-value' }, `${userData.deposits_count} активных`)
          )
        ),

        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-icon referrals' }, '👥'),
          React.createElement('div', { className: 'stat-info' },
            React.createElement('span', { className: 'stat-label' }, 'Рефералы'),
            React.createElement('span', { className: 'stat-value' }, userData.referrals.total)
          )
        )
      )
    ),

    // Performance card
    React.createElement('section', { className: 'performance-section' },
      React.createElement('div', { className: 'performance-card' },
        React.createElement('h3', { className: 'card-title' }, '🎯 Производительность'),
        React.createElement('div', { className: 'performance-stats' },
          React.createElement('div', { className: 'perf-item' },
            React.createElement('span', { className: 'perf-label' }, 'ROI за все время'),
            React.createElement('span', { className: 'perf-value positive' },
              userData.total_invested > 0
                ? `+${((userData.total_earned / userData.total_invested) * 100).toFixed(1)}%`
                : '0%'
            )
          ),
          React.createElement('div', { className: 'perf-item' },
            React.createElement('span', { className: 'perf-label' }, 'Средняя доходность'),
            React.createElement('span', { className: 'perf-value' }, '4.2% в день')
          ),
          React.createElement('div', { className: 'perf-item' },
            React.createElement('span', { className: 'perf-label' }, 'Статус счета'),
            React.createElement('span', { className: 'perf-value status active' },
              React.createElement('span', { className: 'status-dot' }),
              'Активен'
            )
          )
        )
      )
    ),

    // Recent transactions
    React.createElement('section', { className: 'transactions-section' },
      React.createElement('h3', { className: 'section-title' }, '📋 Последние транзакции'),
      userData.recent_transactions && userData.recent_transactions.length > 0
        ? React.createElement('div', { className: 'transactions-list' },
            userData.recent_transactions.slice(0, 8).map((tx, index) =>
              React.createElement('div', {
                key: tx.id,
                className: 'transaction-item',
                style: {
                  animation: `slideInRight 0.3s ease-out ${index * 0.1}s both`
                }
              },
                React.createElement('div', { className: 'tx-icon' }, getTransactionIcon(tx.type)),
                React.createElement('div', { className: 'tx-info' },
                  React.createElement('div', { className: 'tx-title' }, getTransactionTitle(tx.type)),
                  React.createElement('div', { className: 'tx-description' },
                    tx.description || 'Операция выполнена'
                  ),
                  React.createElement('div', { className: 'tx-date' }, formatDate(tx.created_at))
                ),
                React.createElement('div', {
                  className: `tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`
                },
                  tx.amount >= 0 ? '+' : '',
                  formatCurrency(Math.abs(tx.amount))
                )
              )
            )
          )
        : React.createElement('div', { className: 'empty-transactions' },
            React.createElement('div', { className: 'empty-icon' }, '📝'),
            React.createElement('p', null, 'Пока нет транзакций'),
            React.createElement('small', null, 'История операций будет отображаться здесь')
          )
    ),

    // Referral section
    React.createElement('section', { className: 'referral-section' },
      React.createElement('div', { className: 'referral-card' },
        React.createElement('h3', { className: 'card-title' }, '🎁 Пригласи друзей'),
        React.createElement('p', { className: 'referral-subtitle' },
          'Получай до 10% с инвестиций друзей на 3 уровня!'
        ),

        React.createElement('div', { className: 'referral-stats' },
          React.createElement('div', { className: 'ref-stat' },
            React.createElement('span', { className: 'ref-count' }, userData.referrals.level1),
            React.createElement('span', { className: 'ref-label' }, '1 ур. (10%)')
          ),
          React.createElement('div', { className: 'ref-stat' },
            React.createElement('span', { className: 'ref-count' }, userData.referrals.level2),
            React.createElement('span', { className: 'ref-label' }, '2 ур. (5%)')
          ),
          React.createElement('div', { className: 'ref-stat' },
            React.createElement('span', { className: 'ref-count' }, userData.referrals.level3),
            React.createElement('span', { className: 'ref-label' }, '3 ур. (2%)')
          )
        ),

        React.createElement('div', { className: 'referral-earnings' },
          React.createElement('span', { className: 'earnings-label' }, 'Заработано с рефералов:'),
          React.createElement('span', { className: 'earnings-amount' }, formatCurrency(userData.referral_earnings))
        ),

        React.createElement('div', { className: 'referral-link' },
          React.createElement('div', { className: 'link-header' }, 'Ваша реферальная ссылка:'),
          React.createElement('div', { className: 'link-container' },
            React.createElement('code', { className: 'ref-code' }, userData.referral_code),
            React.createElement('button', {
              className: 'copy-btn',
              onClick: () => copyToClipboard(`https://t.me/your_bot?start=${userData.referral_code}`)
            }, '📋 Копировать')
          )
        )
      )
    ),

    // Footer
    React.createElement('footer', { className: 'app-footer' },
      React.createElement('div', { className: 'footer-content' },
        React.createElement('p', null, '💎 TON STOCKER v3.0'),
        React.createElement('p', null, 'AI-powered investment platform'),
        React.createElement('div', { className: 'footer-links' },
          React.createElement('span', null, '📞 Support: @support_ton'),
          React.createElement('span', null, '🌐 Web: tonstocker.io')
        )
      )
    )
  );
};

// Инициализация приложения
window.addEventListener('load', () => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
});

// Обработка ошибок
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

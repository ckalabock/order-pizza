# Описание для построения Class Diagram этапа 3

Используй это описание как точное техническое задание для построения новой UML-диаграммы классов по основному бизнес-процессу ИС «Заказ пиццы».

## Цель диаграммы

Нужно показать полный основной бизнес-процесс этапа 3:
выбор товаров -> расчет заказа -> применение промокода -> планирование доставки -> создание заказа -> изменение статуса заказа -> публикация отзыва.

## Что обязательно включить в диаграмму

Покажи два уровня:

1. Доменные сущности
2. Сервисные классы, которые координируют бизнес-логику

## Доменные классы

### User
- `id: UUID`
- `email: string`
- `name: string`
- `passwordHash: string`
- `role: string`
- `createdAt: datetime`

### UserAddress
- `id: UUID`
- `label: string`
- `address: string`
- `comment: string?`
- `isDefault: bool`
- `createdAt: datetime`

Связь:
- `User 1 -> 0..* UserAddress`

### Pizza
- `id: string`
- `name: string`
- `description: string`
- `basePrice: int`
- `category: string`
- `image: string?`
- `available: bool`

### Size
- `id: string`
- `name: string`
- `multiplier: float`

### Topping
- `id: string`
- `name: string`
- `price: int`
- `available: bool`

### PromoCode
- `id: UUID`
- `code: string`
- `title: string`
- `description: string?`
- `discountType: string`
- `discountValue: int`
- `minOrderTotal: int`
- `active: bool`
- `createdAt: datetime`

### Order
- `id: UUID`
- `publicToken: string`
- `status: string`
- `customerName: string`
- `customerPhone: string`
- `deliveryAddress: string`
- `deliveryComment: string?`
- `paymentMethod: string`
- `subtotal: int`
- `discount: int`
- `promoCode: string?`
- `promoDiscount: int`
- `bonusSpent: int`
- `deliveryPrice: int`
- `total: int`
- `scheduledFor: datetime?`
- `createdAt: datetime`

Связи:
- `User 1 -> 0..* Order`
- `Order 1 -> 1..* OrderItem`
- `Order 1 -> 0..1 Review`

### OrderItem
- `id: UUID`
- `qty: int`
- `unitPrice: int`
- `title: string`
- `pizzaId: string`
- `sizeId: string`

Связи:
- `OrderItem 1 -> 0..* OrderItemTopping`
- `OrderItem * -> 1 Pizza`
- `OrderItem * -> 1 Size`

### OrderItemTopping
- `orderItemId: UUID`
- `toppingId: string`

Связь:
- `OrderItemTopping * -> 1 Topping`

### Review
- `id: UUID`
- `orderId: UUID`
- `userId: UUID`
- `rating: int`
- `comment: string?`
- `createdAt: datetime`

Связи:
- `Review * -> 1 User`
- `Review 1 -> 1 Order`

## Сервисные классы

### OrderFlowService
Ответственность:
- валидирует состав заказа
- рассчитывает стоимость позиций
- применяет комбо-скидку
- проверяет промокод
- проверяет бонусы
- валидирует отложенную доставку
- формирует итоговую стоимость заказа

Методы:
- `prepareOrder(previewData, user)`
- `normalizePromoCode(code)`
- `normalizeScheduledFor(datetime)`
- `calcPromoDiscount(promo, subtotalAfterCombo)`

### PricingService
Ответственность:
- расчет цены позиции
- расчет стандартной скидки по комбо
- расчет доставки

Методы:
- `calcUnitPrice(...)`
- `calcDiscountForItem(...)`
- `calcDelivery(...)`

### BonusService
Ответственность:
- рассчитывает баланс бонусов пользователя

Метод:
- `calcBonusStats(userId)`

### AdminOrderService
Ответственность:
- изменяет жизненный цикл заказа через статусы

### ReviewService
Ответственность:
- разрешает отзыв только после статуса `done`
- создает или обновляет отзыв клиента

## Ключевые ассоциации, которые должны быть явно видны

- `User` связан с `Order`
- `User` связан с `UserAddress`
- `Order` композиционно содержит `OrderItem`
- `OrderItem` композиционно содержит `OrderItemTopping`
- `Order` агрегирует `Review`
- `Order` использует данные `PromoCode`
- `OrderFlowService` зависит от `PricingService`, `BonusService`, `PromoCode`, `Order`, `OrderItem`
- `ReviewService` зависит от `Order`, `Review`, `User`
- `AdminOrderService` зависит от `Order`

## Бизнес-правила, которые нужно отразить на диаграмме

- Промокод применяется только если активен и выполнен минимум суммы заказа.
- Отложенная доставка допустима минимум через 30 минут и максимум на 7 дней вперед.
- Отзыв разрешен только владельцу заказа и только после перехода заказа в статус `done`.
- Бонусы доступны только авторизованному пользователю.
- Итоговая сумма заказа формируется после применения скидок, доставки и списания бонусов.

## Нотация и оформление

- Используй стандартную UML Class Diagram.
- Покажи кратности у всех ключевых связей.
- Для композиции `Order -> OrderItem` и `OrderItem -> OrderItemTopping` используй закрашенный ромб.
- Для сервисов используй зависимости (`dependency`) пунктирной стрелкой.
- Диаграмма должна быть читаемой и ориентированной именно на основной бизнес-процесс оформления и сопровождения заказа на этапе 3.

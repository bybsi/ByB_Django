
class Currency:
    # 6 decimal places
    SCALE_FACTOR = 1000000
    # Chop everything after that

    @staticmethod
    def decimal_to_currency(amount: float):
        return int(amount * Currency.SCALE_FACTOR)


    @staticmethod
    def currency_to_decimal(amount: int): #bigint
        return amount / Currency.SCALE_FACTOR


    @staticmethod
    def multiply(amount: float, price: float):
        return int(amount * Currency.decimal_to_currency(price))

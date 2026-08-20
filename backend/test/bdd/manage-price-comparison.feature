Feature: Purchase price comparison
  As a buyer
  I want to compare prices across suppliers
  So that I can decide who to buy from and spot pricing trends

  Scenario: Buyer compares a product's price across suppliers, cheapest first
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    And an existing active supplier "Beta SA"
    And an existing product "Arroz"
    And supplier "Acme Corp" sold "Arroz" at 15 on "2026-08-01"
    And supplier "Beta SA" sold "Arroz" at 9 on "2026-08-05"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the price comparison for product "Arroz"
    Then the response is successful
    And the price comparison lists 2 suppliers
    And the cheapest supplier in the comparison is "Beta SA" at 9

  Scenario: Buyer compares a product only one supplier has sold at different prices over time
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And supplier "Acme Corp" sold "Arroz" at 10 on "2026-06-01"
    And supplier "Acme Corp" sold "Arroz" at 12 on "2026-08-01"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the price comparison for product "Arroz"
    Then the response is successful
    And the price comparison lists 1 suppliers
    And the cheapest supplier in the comparison is "Acme Corp" at 12

  Scenario: Buyer compares a product no supplier has ever sold
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing product "Paracetamol"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the price comparison for product "Paracetamol"
    Then the response is successful
    And the price comparison lists 0 suppliers

  Scenario: Requesting the price comparison of a product that does not exist is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the price comparison of a product that does not exist
    Then they receive a not found error

  Scenario: A user without the purchases:read permission cannot compare product prices
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "purchases" "read"
    And an existing product "Arroz"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they request the price comparison for product "Arroz"
    Then they receive a forbidden error

  Scenario: Buyer compares the monthly average price trend of two suppliers
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    And an existing active supplier "Beta SA"
    And an existing product "Arroz"
    And an existing product "Paracetamol"
    And supplier "Acme Corp" sold "Arroz" at 10 on "2026-06-05"
    And supplier "Acme Corp" sold "Paracetamol" at 20 on "2026-06-20"
    And supplier "Beta SA" sold "Arroz" at 8 on "2026-06-10"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the monthly price comparison for suppliers "Acme Corp" and "Beta SA"
    Then the response is successful
    And the monthly comparison has 1 months
    And the average price for "Acme Corp" in month "2026-06" is 15
    And the average price for "Beta SA" in month "2026-06" is 8

  Scenario: Requesting a monthly comparison with only one supplier is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the monthly price comparison for a single supplier
    Then they receive a bad request error

  Scenario: Requesting a monthly comparison that includes a supplier that does not exist is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the monthly price comparison including a supplier that does not exist
    Then they receive a not found error

  Scenario: A user without the purchases:read permission cannot compare supplier price trends
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    And an existing active supplier "Beta SA"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they request the monthly price comparison for suppliers "Acme Corp" and "Beta SA"
    Then they receive a forbidden error

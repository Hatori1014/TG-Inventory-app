Feature: Manage purchases
  As a buyer
  I want to register a purchase from a supplier with quantities and prices
  So that inventory and purchase history update automatically

  Scenario: Buyer registers a purchase with one item and stock increases
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz" that does not require a batch
    And an existing active location "Bodega A"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a purchase from that supplier with 10 units of that product at 2.5 each into that location
    Then the purchase is registered successfully
    And the response shows a total amount of 25
    And the stock of that product at that location increased by 10

  Scenario: Buyer registers a purchase of a product that requires a batch, with a new batch number
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Paracetamol" that requires a batch
    And an existing active location "Bodega A"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a purchase from that supplier with 5 units of that product at 1 each into that location using batch number "LOT-A1"
    Then the purchase is registered successfully
    And the response includes an item with batch number "LOT-A1"

  Scenario: Registering a purchase of a product that requires a batch without a batch number is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Paracetamol" that requires a batch
    And an existing active location "Bodega A"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a purchase from that supplier with 5 units of that product at 1 each into that location
    Then they receive a bad request error

  Scenario: Registering a purchase from an inactive supplier is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "create"
    And an existing inactive supplier "Proveedor Cerrado"
    And an existing product "Arroz" that does not require a batch
    And an existing active location "Bodega A"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a purchase from that supplier with 10 units of that product at 2.5 each into that location
    Then they receive a bad request error

  Scenario: Registering a purchase into an inactive location is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz" that does not require a batch
    And an existing inactive location "Bodega Cerrada"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a purchase from that supplier with 10 units of that product at 2.5 each into that location
    Then they receive a bad request error

  Scenario: A user without the purchases:create permission cannot register a purchase
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "purchases" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz" that does not require a batch
    And an existing active location "Bodega A"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they attempt to register a purchase from that supplier with 10 units of that product at 2.5 each into that location
    Then they receive a forbidden error

  Scenario: A purchase with multiple items updates the stock of each item independently
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz" that does not require a batch
    And an existing product "Frijol" that does not require a batch
    And an existing active location "Bodega A"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a purchase from that supplier with two items: 10 units of "Arroz" at 2.5 each, and 4 units of "Frijol" at 3 each, both into that location
    Then the purchase is registered successfully
    And the response shows a total amount of 37

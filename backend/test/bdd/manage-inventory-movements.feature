Feature: Associate inventory to a location
  As an inventory administrator
  I want to register stock movements against a location
  So that a product's stock only ever exists tied to a valid, active location

  Scenario: Administrator associates stock to a product at a valid, active location
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l1" with idempotency key "key-1"
    Then the movement is registered successfully
    And the stock for product "p1" at location "l1" is 10

  Scenario: Registering a movement against a location that does not exist is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "missing-location" with idempotency key "key-2"
    Then they receive a bad request error

  Scenario: Registering a movement against an inactive location is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing inactive location "l2"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l2" with idempotency key "key-3"
    Then they receive a bad request error

  Scenario: A user without the inventory:create permission cannot register a movement
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to register an "in" movement of 10 units for product "p1" at location "l1" with idempotency key "key-4"
    Then they receive a forbidden error

  Scenario: Registering a movement without an Idempotency-Key header is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l1" without an idempotency key
    Then they receive a bad request error

  Scenario: Repeating the same Idempotency-Key does not double the stock
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l1" with idempotency key "key-5"
    And they register the same movement again with idempotency key "key-5"
    Then the stock for product "p1" at location "l1" is 10

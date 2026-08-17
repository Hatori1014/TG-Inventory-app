Feature: Register stock movements
  As an inventory administrator
  I want to register stock movements against a location — including
  decreases, adjustments, and transfers between locations
  So that a product's stock only ever exists tied to a valid, active
  location and never goes negative

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

  Scenario: Administrator registers an "out" movement that decreases available stock
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing stock of 20 units for product "p1" at location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "out" movement of 5 units for product "p1" at location "l1" with idempotency key "key-6"
    Then the movement is registered successfully
    And the stock for product "p1" at location "l1" is 15

  Scenario: Registering an "out" movement larger than the available stock is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing stock of 5 units for product "p1" at location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "out" movement of 10 units for product "p1" at location "l1" with idempotency key "key-7"
    Then they receive a conflict error
    And the stock for product "p1" at location "l1" is 5

  Scenario: Administrator registers an "adjustment" that increases stock
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing stock of 10 units for product "p1" at location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "adjustment" with direction "increase" of 3 units for product "p1" at location "l1" with idempotency key "key-8"
    Then the movement is registered successfully
    And the stock for product "p1" at location "l1" is 13

  Scenario: Administrator registers an "adjustment" that decreases stock
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing stock of 10 units for product "p1" at location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "adjustment" with direction "decrease" of 3 units for product "p1" at location "l1" with idempotency key "key-9"
    Then the movement is registered successfully
    And the stock for product "p1" at location "l1" is 7

  Scenario: Administrator transfers stock between two active locations atomically
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing active location "l2"
    And an existing stock of 20 units for product "p1" at location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they transfer 8 units of product "p1" from location "l1" to location "l2" with idempotency key "key-10"
    Then the transfer is registered successfully
    And the stock for product "p1" at location "l1" is 12
    And the stock for product "p1" at location "l2" is 8

  Scenario: Transferring more than the source has available is rejected and neither location changes
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing active location "l2"
    And an existing stock of 5 units for product "p1" at location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they transfer 10 units of product "p1" from location "l1" to location "l2" with idempotency key "key-11"
    Then they receive a conflict error
    And the stock for product "p1" at location "l1" is 5

  Scenario: Consulting stock filtered by location only returns matching rows
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And an existing active location "l1"
    And an existing active location "l2"
    And an existing stock of 10 units for product "p1" at location "l1"
    And an existing stock of 5 units for product "p1" at location "l2"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they consult stock filtered by location "l1"
    Then the stock list has 1 row
    And the stock list includes location "l1" but not location "l2"

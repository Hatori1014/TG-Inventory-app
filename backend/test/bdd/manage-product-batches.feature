Feature: Track product batches for perishable products
  As an inventory administrator
  I want to mark a product as requiring batch/expiration tracking and
  manage its batches
  So that perishable products are traced differently from ones that are not

  Scenario: Administrator creates a batch for a product that requires batch tracking
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1" that requires batch tracking
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a batch "LOT-1" for product "p1"
    Then the batch is created successfully
    And the response includes the batch number "LOT-1"

  Scenario: Creating a batch for a product that does not require batch tracking is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1" that does not require batch tracking
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a batch "LOT-1" for product "p1"
    Then they receive a bad request error

  Scenario: Administrator lists the batches of a product
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And the role "Administrador" has permission "inventory" "read"
    And an existing product "p1" that requires batch tracking
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a batch "LOT-1" for product "p1"
    And they list the batches for product "p1"
    Then the list includes a batch numbered "LOT-1"

  Scenario: A user without the inventory:create permission cannot create a batch
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "inventory" "create"
    And an existing product "p1" that requires batch tracking
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to create a batch "LOT-1" for product "p1"
    Then they receive a forbidden error

  Scenario: Registering a movement for a product that requires batch tracking without a batchId is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1" that requires batch tracking
    And an existing active location "l1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l1" without a batch id, with idempotency key "batch-key-1"
    Then they receive a bad request error

  Scenario: Registering a movement with a matching batchId succeeds
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1" that requires batch tracking
    And an existing active location "l1"
    And an existing batch "b1" for product "p1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l1" with batch "b1", with idempotency key "batch-key-2"
    Then the movement is registered successfully

  Scenario: Registering a movement with a batchId that belongs to a different product is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1" that requires batch tracking
    And an existing product "p2" that requires batch tracking
    And an existing active location "l1"
    And an existing batch "b2" for product "p2"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they register an "in" movement of 10 units for product "p1" at location "l1" with batch "b2", with idempotency key "batch-key-3"
    Then they receive a bad request error

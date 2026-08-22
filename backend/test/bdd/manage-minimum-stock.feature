Feature: Define minimum stock per product
  As an inventory administrator
  I want to define a minimum stock threshold for a product
  So that the system can warn me before it runs out

  Scenario: Administrator defines a minimum for a product that does not have one yet
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they define a minimum of 10 for product "p1"
    Then the minimum is created successfully
    And the response includes a minimum quantity of 10

  Scenario: Defining a second minimum for a product that already has one is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And an existing product "p1"
    And that product already has a minimum of 10 defined
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they define a minimum of 15 for product "p1"
    Then they receive a conflict error

  Scenario: Administrator edits an existing minimum
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And the role "Administrador" has permission "inventory" "update"
    And an existing product "p1"
    And that product already has a minimum of 10 defined
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they edit that minimum to 35
    Then the minimum is updated successfully
    And the response includes a minimum quantity of 35

  Scenario: Defining a minimum for a product that does not exist is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they define a minimum of 10 for a product that does not exist
    Then they receive a bad request error

  Scenario: Editing a minimum that does not exist is rejected
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "update"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they attempt to edit a minimum that does not exist
    Then they receive a not found error

  Scenario: Administrator lists the minimum stock thresholds
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "inventory" "create"
    And the role "Administrador" has permission "inventory" "read"
    And an existing product "p1"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they define a minimum of 10 for product "p1"
    And they list the minimum stock thresholds
    Then the list includes a minimum quantity of 10

  Scenario: A user without the inventory:create permission cannot define a minimum
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "inventory" "create"
    And an existing product "p1"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to define a minimum of 10 for product "p1"
    Then they receive a forbidden error

  Scenario: A user without the inventory:update permission cannot edit a minimum
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "inventory" "update"
    And an existing product "p1"
    And that product already has a minimum of 10 defined
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they attempt to edit that minimum to 35
    Then they receive a forbidden error

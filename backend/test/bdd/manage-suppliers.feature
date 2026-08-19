Feature: Manage suppliers
  As a buyer
  I want to register suppliers with their contact data
  So that I can associate purchases with them

  Scenario: Buyer registers a supplier with just the required name
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "suppliers" "create"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a supplier named "Acme Corp"
    Then the supplier is created successfully
    And the response includes the supplier name "Acme Corp"

  Scenario: Buyer registers a supplier with a tax ID
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "suppliers" "create"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a supplier named "Beta SA" with tax ID "NIT-123"
    Then the supplier is created successfully
    And the response includes the supplier tax ID "NIT-123"

  Scenario: Registering a supplier with a tax ID already used by an active supplier is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "suppliers" "create"
    And an existing active supplier "Beta SA" with tax ID "NIT-123"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a supplier named "Beta SA Duplicada" with tax ID "NIT-123"
    Then they receive a conflict error

  Scenario: Registering a supplier with a tax ID already used by an inactive supplier is allowed
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "suppliers" "create"
    And an existing inactive supplier "Beta SA Vieja" with tax ID "NIT-123"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they register a supplier named "Beta SA Nueva" with tax ID "NIT-123"
    Then the supplier is created successfully

  Scenario: A user without the suppliers:create permission cannot register a supplier
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "suppliers" "create"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they attempt to register a supplier named "Hacker Corp"
    Then they receive a forbidden error

  Scenario: Buyer deactivates a supplier instead of deleting it
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "suppliers" "update"
    And an existing active supplier "Acme Corp" with tax ID "NIT-123"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they deactivate that supplier
    Then the supplier is updated successfully
    And the response shows the supplier as inactive

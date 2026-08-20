Feature: Supplier purchase history
  As a buyer
  I want to see a supplier's purchase history ordered by date
  So that I can evaluate their performance

  Scenario: Buyer views the purchase history of a supplier with purchases, newest first
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    And that supplier has a purchase dated "2026-08-10" for 100
    And that supplier has a purchase dated "2026-08-15" for 50
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request that supplier's purchase history
    Then the response is successful
    And the history has 2 purchases
    And the newest purchase in the history has a total amount of 50

  Scenario: Buyer views the purchase history of a supplier with no purchases
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    And an existing active supplier "Beta SA"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request that supplier's purchase history
    Then the response is successful
    And the history has 0 purchases

  Scenario: Requesting the purchase history of a supplier that does not exist is rejected
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" has permission "purchases" "read"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they request the purchase history of a supplier that does not exist
    Then they receive a not found error

  Scenario: A user without the purchases:read permission cannot view a supplier's purchase history
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "purchases" "read"
    And an existing active supplier "Acme Corp"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they request that supplier's purchase history
    Then they receive a forbidden error

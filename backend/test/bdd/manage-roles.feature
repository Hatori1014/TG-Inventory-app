Feature: Manage roles and permissions
  As an administrator
  I want to create roles and assign permissions per module/action
  So that I can control what each user is allowed to do

  Scenario: Administrator creates a role successfully
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "roles" "create"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they create a role named "Buyer" with description "Can register purchases"
    Then the role is created successfully
    And the response includes the role name "Buyer"

  Scenario: Administrator assigns permissions to a role
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "roles" "update"
    And an existing role "Buyer" with no permissions
    And an existing permission "purchases" "create"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they assign permission "purchases" "create" to the role "Buyer"
    Then the role "Buyer" has permission "purchases" "create"

  Scenario: A user without the roles:create permission cannot create a role
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "roles" "create"
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they create a role named "Hacker Role"
    Then they receive a forbidden error

  Scenario: Deleting a role reassigns its users to the default role
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "roles" "delete"
    And an existing default role "Solicitante"
    And an existing role "Comprador" with no permissions
    And a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they delete the role "Comprador"
    Then the role is deleted successfully
    And 1 users were reassigned
    And the user "buyer@tg-group.local" now has role "Solicitante"

  Scenario: The default role cannot be deleted
    Given a user "admin@tg-group.local" with password "correct-password" and role "Administrador"
    And the role "Administrador" has permission "roles" "delete"
    And an existing default role "Solicitante"
    When they log in with email "admin@tg-group.local" and password "correct-password"
    And they try to delete the role "Solicitante"
    Then they receive a conflict error

  Scenario: A user without the roles:delete permission cannot delete a role
    Given a user "buyer@tg-group.local" with password "correct-password" and role "Comprador"
    And the role "Comprador" does not have permission "roles" "delete"
    And an existing role "Intern" with no permissions
    When they log in with email "buyer@tg-group.local" and password "correct-password"
    And they try to delete the role "Intern"
    Then they receive a forbidden error

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

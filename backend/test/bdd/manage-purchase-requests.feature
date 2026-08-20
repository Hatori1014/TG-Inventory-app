Feature: Purchase requests
  As a requester
  I want to create a purchase request, optionally as a draft first
  So that it can later be reviewed by an approver

  Scenario: Requester submits a purchase request directly
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they submit a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    Then the request is created successfully
    And the request status is "pending"

  Scenario: Requester saves a purchase request as a draft with nothing filled in yet
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they save an empty purchase request as a draft
    Then the request is created successfully
    And the request status is "draft"

  Scenario: Submitting a purchase request directly without a supplier is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they submit a purchase request without a supplier for 5 units of "Arroz" at "Bodega Central"
    Then they receive a bad request error

  Scenario: Requester edits their own draft and then submits it
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they save an empty purchase request as a draft
    And they edit that draft to supplier "Acme Corp" with 5 units of "Arroz" at "Bodega Central"
    And they submit that draft
    Then the request status is "pending"

  Scenario: A requester cannot edit another requester's draft
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "other@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they save an empty purchase request as a draft
    And "other@tg-group.local" logs in and tries to edit that draft
    Then they receive a forbidden error

  Scenario: Editing a request that is no longer a draft is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they submit a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And they try to edit that already-submitted request
    Then they receive a conflict error

  Scenario: Requester lists only their own requests
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "other@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Solicitante" has permission "requests" "read"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When "other@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And they log in with email "requester@tg-group.local" and password "correct-password"
    And they save an empty purchase request as a draft
    And they list their own requests
    Then the list has 1 requests

  Scenario: A requester cannot view another requester's request
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "other@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Solicitante" has permission "requests" "read"
    When "other@tg-group.local" logs in and saves an empty purchase request as a draft
    And they log in with email "requester@tg-group.local" and password "correct-password"
    And they try to view that other request
    Then they receive a forbidden error

  Scenario: Creating a request that references a product that does not exist is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And an existing active supplier "Acme Corp"
    And an existing active location "Bodega Central"
    When they log in with email "requester@tg-group.local" and password "correct-password"
    And they submit a purchase request to supplier "Acme Corp" for 5 units of a product that does not exist at "Bodega Central"
    Then they receive a bad request error

  Scenario: A user without the requests:create permission cannot create a request
    Given a user "guest@tg-group.local" with password "correct-password" and role "Invitado"
    And the role "Invitado" does not have permission "requests" "create"
    When they log in with email "guest@tg-group.local" and password "correct-password"
    And they attempt to save an empty purchase request as a draft
    Then they receive a forbidden error

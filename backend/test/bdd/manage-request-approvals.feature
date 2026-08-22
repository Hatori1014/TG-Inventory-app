Feature: Approve, reject, and integrate requests
  As an approver or inventory admin
  I want to approve/reject requests and integrate approved purchases
  So that inventory movements and purchases only happen with proper authorization

  Scenario: A purchase request needs both required approvals before it can be integrated
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "approver1@tg-group.local" with password "correct-password" and role "Aprobador"
    And a user "approver2@tg-group.local" with password "correct-password" and role "Aprobador"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Aprobador" has permission "requests" "approve"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And a purchase request requires 2 approvals
    When "requester@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And "approver1@tg-group.local" approves that request
    Then the request status is "in_review"
    When "approver2@tg-group.local" approves that request
    Then the request status is "pending_inventory_integration"

  Scenario: A single rejection closes the request immediately, with a mandatory comment
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "approver1@tg-group.local" with password "correct-password" and role "Aprobador"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Aprobador" has permission "requests" "approve"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And a purchase request requires 2 approvals
    When "requester@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And "approver1@tg-group.local" rejects that request with comment "Budget exceeded this quarter"
    Then the request status is "closed"
    And the last approval decision is "rejected" with comment "Budget exceeded this quarter"

  Scenario: Rejecting a request without a comment is rejected
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "approver1@tg-group.local" with password "correct-password" and role "Aprobador"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Aprobador" has permission "requests" "approve"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When "requester@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And "approver1@tg-group.local" tries to reject that request without a comment
    Then they receive a bad request error

  Scenario: A requester cannot approve their own request
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Solicitante" has permission "requests" "approve"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    When "requester@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And "requester@tg-group.local" tries to approve their own request
    Then they receive a forbidden error

  Scenario: An approver cannot vote twice on the same request
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "approver1@tg-group.local" with password "correct-password" and role "Aprobador"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Aprobador" has permission "requests" "approve"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And a purchase request requires 2 approvals
    When "requester@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And "approver1@tg-group.local" approves that request
    And "approver1@tg-group.local" tries to approve that request again
    Then they receive a conflict error

  Scenario: A single approval resolves a consumption request and applies the real stock movement
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "approver1@tg-group.local" with password "correct-password" and role "Aprobador"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Aprobador" has permission "requests" "approve"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And there are 10 units of "Arroz" available at "Bodega Central"
    And a consumption request requires 1 approval
    When "requester@tg-group.local" logs in and submits a consumption request for 4 units of "Arroz" at "Bodega Central"
    And "approver1@tg-group.local" approves that request
    Then the request status is "closed"

  Scenario: The inventory admin integrates an approved purchase request into a real purchase
    Given a user "requester@tg-group.local" with password "correct-password" and role "Solicitante"
    And a user "approver1@tg-group.local" with password "correct-password" and role "Aprobador"
    And a user "admin@tg-group.local" with password "correct-password" and role "Admin Inventario"
    And the role "Solicitante" has permission "requests" "create"
    And the role "Aprobador" has permission "requests" "approve"
    And the role "Admin Inventario" has permission "requests" "integrate"
    And an existing active supplier "Acme Corp"
    And an existing product "Arroz"
    And an existing active location "Bodega Central"
    And a purchase request requires 1 approval
    When "requester@tg-group.local" logs in and submits a purchase request to supplier "Acme Corp" for 5 units of "Arroz" at "Bodega Central"
    And "approver1@tg-group.local" approves that request
    Then the request status is "pending_inventory_integration"
    When "admin@tg-group.local" integrates that request receiving 5 units at unit price 1200
    Then the request status is "closed"
    And the request has an associated purchase

/**
* @File Name : ProposalController .cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : June 30, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | June 26, 2025 |   | Initial Version
**/

public with sharing class ProposalController {

    @AuraEnabled(cacheable=true)
    public static List<Shell__c> getShellsByOpportunity(Id opportunityId) {
        Opportunity opp = [
            SELECT Id, AccountId FROM Opportunity WHERE Id = :opportunityId LIMIT 1
        ];

        return [
            SELECT Id, Name
            FROM Shell__c
            WHERE Account__c = :opp.AccountId
        ];
    }
    
    @AuraEnabled
    public static void createProposalsWithShells(Id opportunityId, List<List<Id>> shellGroups) {
        List<Proposal__c> proposals = new List<Proposal__c>();
        
        // Step 1: Create proposals
        for (Integer i = 0; i < shellGroups.size(); i++) {
            Proposal__c proposal = new Proposal__c(
                Opportunity__c = opportunityId
            );
            proposals.add(proposal);
        }

        insert proposals;

        //  Collect all shell IDs
        Set<Id> allShellIds = new Set<Id>();
        for (List<Id> sg : shellGroups) {
            allShellIds.addAll(sg);
        }

        //  Query Client_Location__c records where Shell__c IN :shellIds
        Map<Id, Client_Location__c> shellToClientLocationMap = new Map<Id, Client_Location__c>();
        for (Client_Location__c cl : [
            SELECT Id, Shell__c FROM Client_Location__c WHERE Shell__c IN :allShellIds
        ]) {
            shellToClientLocationMap.put(cl.Shell__c, cl);
        }

        List<Proposal_Shells__c> proposalShells = new List<Proposal_Shells__c>();

        for (Integer i = 0; i < shellGroups.size(); i++) {
            Id proposalId = proposals[i].Id;

            for (Id shellId : shellGroups[i]) {
                Proposal_Shells__c ps = new Proposal_Shells__c(
                    Proposal__c = proposalId,
                    Shell__c = shellId,
                    Opportunity__c = opportunityId
                );
            if (shellToClientLocationMap.containsKey(shellId)) {
                    ps.Client_Location__c = shellToClientLocationMap.get(shellId).Id;
                }

                proposalShells.add(ps);
            }
        }

        insert proposalShells;
    }

}
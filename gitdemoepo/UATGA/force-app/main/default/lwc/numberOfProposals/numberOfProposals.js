import { LightningElement, api, track } from 'lwc';
import createProposalsWithShells from '@salesforce/apex/ProposalController.createProposalsWithShells';
import getShellsByOpportunity from '@salesforce/apex/ProposalController.getShellsByOpportunity';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

export default class NumberOfProposals extends NavigationMixin(LightningElement) {
    @api recordId;

    @track showTemplate = false;
    @track showButton = true;
    @track proposalCount;
    @track shells = [];
    @track showShellTable = false;
    @track proposalTables = [];

    columns = [
        { label: 'Shell Name', fieldName: 'Name' }
    ];

    handleClick() {
        this.showTemplate = true;
        this.showButton = false;
        this.showShellTable = false;
    }

    handleInputChange(event) {
        this.proposalCount = event.detail.value;
    }

    handleBack() {
        this.showTemplate = false;
        this.showButton = true;
        this.proposalCount = '';
    }

    handleBack2() {
        this.showTemplate = true;
        this.showShellTable = false;
        this.proposalCount = '';
    }

    hideModalBox() {
        this.showTemplate = false;
        this.showShellTable = false;
        this.showButton = true;
        this.proposalCount = '';
    }

    handleNext() {
        if (!this.proposalCount || this.proposalCount <= 0) {
            this.showToast('Error', 'Please enter a valid number.', 'error');
            return;
        }

        this.fetchShells();
        this.showTemplate = false;
        this.showButton = false;
    }

    fetchShells() {
        getShellsByOpportunity({ opportunityId: this.recordId })
            .then(result => {
                this.shells = result;

                if (this.shells.length < this.proposalCount) {
                    this.showToast('Error', `Only ${this.shells.length} shells found. You requested ${this.proposalCount} Proposals.`, 'error');
                    this.resetState();
                    return;
                }

                this.proposalTables = [];
                for (let i = 0; i < this.proposalCount; i++) {
                    this.proposalTables.push({
                        id: i + 1,
                        selectedShells: [],
                        data: []
                    });
                }

                this.refreshShellTables();
                this.showShellTable = true;
            })
            .catch(error => {
                console.error('Error fetching shells:', error);
                this.showToast('Error', 'Error fetching shells', 'error');
            });
    }

    refreshShellTables() {
        const selectedShellIds = new Set();
        this.proposalTables.forEach(table => {
            table.selectedShells.forEach(id => selectedShellIds.add(id));
        });

        this.proposalTables = this.proposalTables.map((table, i) => {
            const shellData = this.shells.filter(shell =>
                !selectedShellIds.has(shell.Id) || table.selectedShells.includes(shell.Id)
            );

            return {
                ...table,
                data: shellData
            };
        });
    }

    handleRowSelection(event) {
        const index = event.target.dataset.index;
        const selected = event.detail.selectedRows.map(row => row.Id);
        this.proposalTables[index].selectedShells = selected;
        this.refreshShellTables();
    }

    handleSubmit() {
        if (!this.proposalCount || this.proposalCount <= 0) return;

        const shellGroups = this.proposalTables.map(table => table.selectedShells);
        const totalSelected = shellGroups.flat().length;

        if (totalSelected === 0) {
            this.showToast('Error', 'Please select at least one shell.', 'error');
            return;
        }

        createProposalsWithShells({
            opportunityId: this.recordId,
            shellGroups: shellGroups
        })
        .then(() => {
            this.showToast('Success', 'Proposals and Proposal Shells created successfully.', 'success');
            this.navigateToRecordPage();
             window.location.reload();
            this.resetState();
        })
        .catch(error => {
            console.error('Error:', error);
            this.showToast('Error', error.body?.message || 'Failed to create proposals.', 'error');
        });
    }

    resetState() {
        this.showButton = true;
        this.showTemplate = false;
        this.showShellTable = false;
        this.proposalCount = null;
        this.proposalTables = [];
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        }));
    }

    navigateToRecordPage() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Opportunity',
                actionName: 'view'
            }
        });
    }
}
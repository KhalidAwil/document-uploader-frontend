import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Import DatePipe
import { AuthService } from '../../../services/auth.service';
import { ContactMessagesService } from '../../../services/contact-messages.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { TruncatePipe } from '../../../pipes/truncate.pipe'; // Import TruncatePipe
import { ArabicDatePipe } from '../../../pipes/arabic-date.pipe';

@Component({
  selector: 'app-admin-contact-messages',
  standalone: true,
  imports: [
      CommonModule,
      TranslateModule,
      TruncatePipe, // Add TruncatePipe
      ArabicDatePipe
    ],
  templateUrl: './admin-contact-messages.component.html',
  styleUrls: ['./admin-contact-messages.component.scss']
})
export class AdminContactMessagesComponent implements OnInit {
  contactMessages: any[] = [];
  selectedMessage: any | null = null;
  isLoading: boolean = false;
  currentUserForPermissions: any | null = null; // For delete permission check

  constructor(
    private contactMessagesService: ContactMessagesService,
    private confirmationModalService: ConfirmationModalService,
    private authService: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserData();
    this.fetchContactMessages();
  }

  loadCurrentUserData(): void {
     this.authService.currentUser.subscribe((userObj: any) => {
        this.currentUserForPermissions = userObj;
    });
  }

  fetchContactMessages(): void {
    this.isLoading = true;
    this.selectedMessage = null; // Clear selection when reloading
    this.contactMessagesService.getMessages().subscribe({
      next: (data: any) => { // Assuming API returns { messages: [...] } or similar
        this.contactMessages = data?.messages || [];
        // Normalize optional fields for consistent display
        this.contactMessages = this.contactMessages.map((message) => ({
          ...message,
          phone: message.phone || '', // Use empty string if null/undefined
          current_residence: message.current_residence || ''
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching messages:', error);
        this.isLoading = false;
        this.contactMessages = []; // Ensure empty array on error
      }
    });
  }

  deleteMessage(id: number): void {
     if (!this.currentUserForPermissions?.roles?.includes('root_super_admin')) {
         console.warn("User does not have permission to delete messages.");
         return; // Optional: show message
     }

    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_DELETE_CONTACT_MESSAGE', // Ensure this key exists
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          this.isLoading = true; // Show loading state during delete
          this.contactMessagesService.deleteMessage(id).subscribe({
            next: () => {
              // Remove the message from the local array
              this.contactMessages = this.contactMessages.filter((message) => message.id !== id);
              // If the deleted message was selected, clear the selection
              if (this.selectedMessage && this.selectedMessage.id === id) {
                this.selectedMessage = null;
              }
               this.isLoading = false;
               // Optionally show success message
            },
            error: (error) => {
              console.error('Error deleting message:', error);
              this.isLoading = false;
              // Optionally show error message
            }
          });
        }
      })
      .catch(() => {
         console.log('Message deletion cancelled.');
      });
  }

  openMessage(message: any): void {
    this.selectedMessage = message;
  }

  clearSelectedMessage(): void {
    this.selectedMessage = null;
  }

   canDeleteMessages(): boolean {
       return this.currentUserForPermissions?.roles?.includes('root_super_admin') ?? false;
   }
}
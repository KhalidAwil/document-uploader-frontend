export const DocumentConfigurations: Record<DocumentType, DocumentConfig> = {
  guide: {
    title: "Guide",
    editableFields: ["title", "description", "date_of_publication", "image_url", "pdf_url"],
    viewableFields: ["title", "description", "date_of_publication", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "created_by_nickname"],
    required: ["title", "description", "date_of_publication", "image_url", "pdf_url"]
  },
  release: {
    title: "Release",
    editableFields: ["title", "description", "date_of_publication", "image_url", "pdf_url", "release_type"],
    viewableFields: ["title", "description", "date_of_publication", "release_type", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "release_type", "created_by_nickname"],
    required: ["title", "description", "date_of_publication", "image_url", "pdf_url", "release_type"]
  },
  news: {
    title: "News",
    editableFields: ["title", "description", "date_of_publication", "image_url", "author"],
    viewableFields: ["title", "description", "date_of_publication", "author", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "description", "author", "date_of_publication", "created_by_nickname"],
    required: ["title", "description", "date_of_publication", "image_url", "author"]
  },
  bian: {
    title: "Bian",
    editableFields: ["title", "description", "date_of_publication", "image_url", "image_url_ar", "image_url_en", "image_url_fr", "image_url_de", "image_url_ru", "image_url_zh_cn", "image_url_msd"],
    viewableFields: ["title", "description", "date_of_publication", "created_by_nickname", "image_url", "image_url_ar", "image_url_en", "image_url_fr", "image_url_de", "image_url_ru", "image_url_zh_cn", "image_url_msd", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "created_by_nickname"],
    required: ["title", "description", "date_of_publication", "image_url"]
  },
  archive_c: {
    title: "Archive-C",
    editableFields: ["title", "description", "date_of_publication", "date_of_event", "type_c", "event_location", "image_url", "image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6", "image_url_7"],
    viewableFields: ["title", "description", "date_of_publication", "date_of_event", "type_c", "event_location", "created_by_nickname", "image_url", "image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6", "image_url_7", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "date_of_event", "type_c", "event_location", "created_by_nickname"],
    required: ["title", "description", "date_of_publication", "date_of_event", "type_c", "image_url", "event_location"]
  },
  athar: {
    title: "Athar",
    editableFields: ["title", "description", "date_of_publication", "image_url", "image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6", "image_url_7", "athar_id", "athar_name", "athar_type", "athar_material", "athar_period", "athar_geo_location", "athar_origin_country", "athar_preservation_status", "athar_arch_original_area", "athar_legal_status", "athar_date_of_loss", "athar_present_location", "athar_present_location_name", "athar_present_location_country", "athar_date_of_presentation", "athar_case_number", "athar_required_procedure", "athar_page_link"],
    viewableFields: ["title", "description", "date_of_publication", "image_url", "image_url_1", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6", "image_url_7", "athar_id", "athar_name", "athar_legal_status", "athar_date_of_loss", "athar_present_location", "athar_present_location_name", "athar_present_location_country", "athar_date_of_presentation", "athar_type", "athar_material", "athar_period", "athar_geo_location", "athar_arch_original_area", "athar_origin_country", "athar_preservation_status", "athar_case_number", "athar_required_procedure", "athar_page_link", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "date_of_publication", "description", "athar_id", "athar_name", "athar_legal_status", "athar_date_of_loss", "athar_present_location", "athar_present_location_name", "athar_present_location_country", "athar_date_of_presentation", "athar_type", "athar_material", "athar_period", "athar_geo_location", "athar_arch_original_area", "athar_origin_country", "athar_preservation_status", "athar_case_number", "athar_required_procedure"],
    required: ["title", "description", "date_of_publication", "image_url", "athar_type", "athar_material", "athar_period", "athar_origin_country", "athar_preservation_status", "athar_legal_status", "athar_present_location", "athar_present_location_country", "athar_required_procedure"]
  },
  video: {
    title: "Video",
    editableFields: ["title", "description", "date_of_publication", "video_url", "video_length"],
    viewableFields: ["title", "description", "date_of_publication", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "created_by_nickname"],
    required: ["title", "description", "date_of_publication"]
  },
  image: {
    title: "Image",
    editableFields: ["title", "description", "date_of_publication", "image_url"],
    viewableFields: ["title", "description", "date_of_publication", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "created_by_nickname"],
    required: ["title", "description", "date_of_publication"]
  },
  media: {
    title: "Media",
    editableFields: ["title", "description", "date_of_publication", "media_type", "image_url", "video_url", "video_length"],
    viewableFields: ["title", "description", "date_of_publication", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["title", "description", "date_of_publication", "media_type", "created_by_nickname"],
    required: ["title", "description", "date_of_publication", "media_type"]
  },
  user: {
    title: "User",
    editableFields: ["first_name", "last_name", "nickname", "email", "password", "role_code"],
    viewableFields: ["first_name", "last_name", "nickname", "email", "role_code", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["first_name", "last_name", "nickname", "email", "created_by_nickname"],
    required: ["first_name", "last_name", "nickname", "email", "password", "role_code"]
  },
  contact_message: {
    title: "Contact Message",
    editableFields: ["name", "email", "subject", "message", "phone", "current_residence"],
    viewableFields: ["name", "email", "subject", "message", "phone", "current_residence", "created_at", "updated_at"],
    filterableFields: ["name", "email", "subject", "message"],
    required: ["name", "email", "subject", "message"]
  },
  audit_log: {
    title: "Audit Log",
    editableFields: ["user_id", "user_nickname", "role_code", "action", "model_type", "model_id", "field_name", "old_value", "new_value", "action_at"],
    viewableFields: ["user_id", "user_nickname", "role_code", "action", "model_type", "model_id", "field_name", "old_value", "new_value", "action_at"],
    filterableFields: ["user_id", "field_name", "action", "user_nickname", "model_type", "role_code"],
    required: ["user_id", "action", "model_type", "model_id", "action_at"]
  },
  site_setting: {
    title: "Site Setting",
    editableFields: ["key", "value"],
    viewableFields: ["key", "value", "created_by_nickname", "created_at", "updated_at"],
    filterableFields: ["key", "created_by_nickname"],
    required: ["key", "value"]
  }
};

export type DocumentType = 'guide' | 'release' | 'news' | 'bian' | 'archive_c' | 'athar' | 'media' | 'user' | 'image' | 'video' | 'contact_message' | 'audit_log' | 'site_setting';

export interface DocumentConfig {
  title: string;
  editableFields: string[];
  filterableFields: string[];
  viewableFields: string[];
  required: string[];
}
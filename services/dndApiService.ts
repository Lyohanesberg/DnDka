
// Service to interact with the D&D 5e API (SRD Content)
// https://www.dnd5eapi.co/docs/

const BASE_URL = 'https://www.dnd5eapi.co/api';

export interface ApiReference {
  index: string;
  name: string;
  url: string;
}

export interface ApiDetail {
  index: string;
  name: string;
  desc?: string[];
  [key: string]: any; // Flexible for different data types (Spells, Monsters, etc.)
}

// Cache for lists to avoid repeated fetches
const listCache: Record<string, ApiReference[]> = {};
const detailCache: Record<string, ApiDetail> = {};

export const dndApi = {
  /**
   * Fetches a list of resources by category (e.g., 'spells', 'monsters')
   */
  getList: async (category: string): Promise<ApiReference[]> => {
    if (listCache[category]) return listCache[category];

    try {
      const response = await fetch(`${BASE_URL}/${category}`);
      const data = await response.json();
      const results = data.results || [];
      listCache[category] = results;
      return results;
    } catch (error) {
      console.error(`Error fetching D&D API list for ${category}:`, error);
      return [];
    }
  },

  /**
   * Fetches details for a specific item by its relative URL
   */
  getDetail: async (url: string): Promise<ApiDetail | null> => {
    if (detailCache[url]) return detailCache[url];

    try {
      const response = await fetch(`https://www.dnd5eapi.co${url}`);
      const data = await response.json();
      detailCache[url] = data;
      return data;
    } catch (error) {
      console.error(`Error fetching D&D API detail for ${url}:`, error);
      return null;
    }
  }
};

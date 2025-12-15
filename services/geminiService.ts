

import { GoogleGenAI, Chat, Content, FunctionDeclaration, Type, Modality, GenerateContentResponse, Schema } from "@google/genai";
import { Character, Message, Sender, MapObject, CustomMonster, ShopItem } from '../types';

const API_KEY = process.env.API_KEY || '';

// Initialize the client safely
let ai: GoogleGenAI | null = null;
try {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } else {
    console.warn("API_KEY is missing in environment variables.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

// --- REQUEST QUEUE (Sequential Execution) ---

// This promise chain ensures that requests are executed one by one,
// preventing the "Overloaded" error when multiple tools/images are requested simultaneously.
let requestQueue = Promise.resolve();

const enqueueRequest = <T>(fn: () => Promise<T>): Promise<T> => {
  // Chain the new request to the end of the queue
  const resultPromise = requestQueue.then(() => {
      return retryRequest(fn);
  });

  // Update the queue pointer to wait for this request (handling errors so the queue doesn't stall)
  requestQueue = resultPromise.catch(() => {}).then(() => {});

  return resultPromise;
};

// --- RETRY LOGIC ---

const retryRequest = async <T>(
  fn: () => Promise<T>, 
  retries: number = 5, 
  delay: number = 2000 // Increased base delay
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Extract status code from various possible locations in the error object
    const errorCode = error?.status || error?.code || error?.response?.status || error?.error?.code;
    const errorMessage = (error?.message || error?.error?.message || JSON.stringify(error)).toLowerCase();
    
    // Check for Rate Limit (429), Service Unavailable (503), or specific messages
    const isTransientError = 
      errorCode === 429 || 
      errorCode === 503 || 
      errorMessage.includes('429') || 
      errorMessage.includes('503') ||
      errorMessage.includes('overloaded') ||
      errorMessage.includes('unavailable') ||
      errorMessage.includes('resource exhausted');

    if (isTransientError && retries > 0) {
      console.warn(`Gemini API Busy (${errorCode || 'Unknown'}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

// --- HELPERS ---

const parseJsonSafe = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Fallback for non-strict JSON (though responseSchema should prevent this)
    console.warn("JSON Parse warning, attempting cleanup", text);
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
        try { return JSON.parse(codeBlockMatch[1]); } catch(e2) { /* ignore */ }
    }
    return null;
  }
};

// --- TOOLS DEFINITIONS ---

const updateHpTool: FunctionDeclaration = {
  name: 'update_hp',
  description: 'Updates a character\'s current HP. Use negative numbers for damage, positive for healing.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: {
        type: Type.STRING,
        description: 'The name of the character to update (e.g. "Valeros"). If not specified, implies the active player.',
      },
      amount: {
        type: Type.INTEGER,
        description: 'The amount of HP to change. E.g., -5 for damage, 5 for healing.',
      },
      reason: {
        type: Type.STRING,
        description: 'Short explanation for the log (e.g., "Goblin arrow", "Healing potion").',
      },
    },
    required: ['amount', 'reason'],
  },
};

const modifyInventoryTool: FunctionDeclaration = {
  name: 'modify_inventory',
  description: 'Adds or removes an item from a character\'s inventory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: {
        type: Type.STRING,
        description: 'The name of the character.',
      },
      item: {
        type: Type.STRING,
        description: 'The name of the item.',
      },
      action: {
        type: Type.STRING,
        enum: ['add', 'remove'],
        description: 'Whether to add or remove the item.',
      },
    },
    required: ['item', 'action'],
  },
};

const requestRollTool: FunctionDeclaration = {
  name: 'request_roll',
  description: 'Requests a player to make a die roll (Ability Check, Saving Throw, or Attack Roll). The game pauses until the user rolls.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: {
        type: Type.STRING,
        description: 'Name of the character who needs to roll.',
      },
      ability: { 
        type: Type.STRING, 
        description: 'The ability score to use (strength, dexterity, constitution, intelligence, wisdom, charisma) or "initiative".' 
      },
      skill: { 
        type: Type.STRING, 
        description: 'Optional skill (athletics, perception, stealth, etc.).' 
      },
      dc: { 
        type: Type.INTEGER, 
        description: 'Target Difficulty Class (DC).' 
      },
      reason: { 
        type: Type.STRING, 
        description: 'Short explanation for the user (e.g., "To lift the rock", "To dodge the trap").' 
      }
    },
    required: ['ability', 'reason']
  }
};

const updateLocationTool: FunctionDeclaration = {
  name: 'update_location',
  description: 'Generates a new location/scene. Describe the visual layout vividly so a Battle Map can be generated from your description.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name of the location (e.g. "The Prancing Pony", "Dark Forest")' },
      description: { type: Type.STRING, description: 'Detailed visual description of the terrain, walls, floor, and lighting. Mention layout clearly (e.g., "A rectangular room with stone pillars in corners").' },
    },
    required: ['name', 'description']
  }
};

const updateQuestTool: FunctionDeclaration = {
  name: 'update_quest',
  description: 'Adds a new quest or updates an existing one. Use this to track objectives.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Short title of the quest.' },
      description: { type: Type.STRING, description: 'Brief description of the objective.' },
      status: { 
        type: Type.STRING, 
        enum: ['active', 'completed', 'failed'],
        description: 'Current status of the quest.' 
      },
      id: { type: Type.STRING, description: 'Unique ID for the quest. Use "new" for a new quest, or pass the existing title to update it.' }
    },
    required: ['title', 'status', 'id']
  }
};

const addNoteTool: FunctionDeclaration = {
  name: 'add_note',
  description: 'Adds a note to the journal about an important NPC, location, or lore fact. Use this to "remember" key details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the note (e.g., "Count Strahd", "The Golden Key").' },
      content: { type: Type.STRING, description: 'The details to remember.' },
      type: { 
        type: Type.STRING, 
        enum: ['npc', 'location', 'lore', 'other'],
        description: 'Category of the note.' 
      }
    },
    required: ['title', 'content', 'type']
  }
};

const manageCombatTool: FunctionDeclaration = {
  name: 'manage_combat',
  description: 'Manages the combat tracker UI. Use this to start combat, update initiative order/health status, or end combat.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['start', 'end', 'update'],
        description: 'start: opens tracker. end: closes tracker. update: refreshes the list of combatants.',
      },
      combatants: {
        type: Type.ARRAY,
        description: 'List of combatants. Required for "update".',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            initiative: { type: Type.INTEGER },
            type: { type: Type.STRING, enum: ['player', 'enemy', 'ally'] },
            isCurrentTurn: { type: Type.BOOLEAN },
            hpStatus: { type: Type.STRING, description: 'Optional status like "Здоровий", "Поранений", "При смерті"' }
          },
          required: ['name', 'initiative', 'type']
        }
      }
    },
    required: ['action']
  }
};

const triggerEffectTool: FunctionDeclaration = {
  name: 'trigger_effect',
  description: 'Triggers a visual effect (particle system) on the map at a specific grid location.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['fireball', 'heal', 'blood', 'magic', 'slash'], description: 'Type of visual effect.' },
      x: { type: Type.INTEGER, description: 'Grid X coordinate (0-19).' },
      y: { type: Type.INTEGER, description: 'Grid Y coordinate (0-14).' }
    },
    required: ['type', 'x', 'y']
  }
};

const updateWeatherTool: FunctionDeclaration = {
  name: 'update_weather',
  description: 'Changes the weather/atmosphere of the current scene. Effects are visual overlays.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['none', 'rain', 'snow', 'ash', 'fog'], description: 'Weather type.' }
    },
    required: ['type']
  }
};

const moveTokenTool: FunctionDeclaration = {
  name: 'move_token',
  description: 'Moves a token on the battle map to new coordinates.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: 'Name of the token to move.' },
      x: { type: Type.INTEGER, description: 'New Grid X (0-19).' },
      y: { type: Type.INTEGER, description: 'New Grid Y (0-14).' }
    },
    required: ['target', 'x', 'y']
  }
};

const spawnTokenTool: FunctionDeclaration = {
  name: 'spawn_token',
  description: 'Spawns a new token (monster/NPC) on the battle map and adds it to combat.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name of the creature.' },
      type: { type: Type.STRING, enum: ['enemy', 'ally', 'neutral'], description: 'Type of token.' },
      x: { type: Type.INTEGER, description: 'Grid X (0-19).' },
      y: { type: Type.INTEGER, description: 'Grid Y (0-14).' },
      size: { type: Type.INTEGER, description: 'Size in grid cells (1=Medium, 2=Large, 3=Huge). Default 1.' },
      hp: { type: Type.INTEGER, description: 'Max HP of the creature.' },
      ac: { type: Type.INTEGER, description: 'Armor Class.' }
    },
    required: ['name', 'type', 'x', 'y']
  }
};

const removeTokenTool: FunctionDeclaration = {
  name: 'remove_token',
  description: 'Removes a token from the battle map (e.g., when defeated).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: { type: Type.STRING, description: 'Name of the token to remove.' }
    },
    required: ['target']
  }
};

export const dmTools = [
  updateHpTool, 
  modifyInventoryTool, 
  requestRollTool, 
  updateLocationTool, 
  updateQuestTool, 
  addNoteTool, 
  manageCombatTool,
  triggerEffectTool,
  updateWeatherTool,
  moveTokenTool,
  spawnTokenTool,
  removeTokenTool
];

// ------------------------

const getSystemInstruction = (party: Character[], summary?: string): string => {
  const summarySection = summary 
    ? `\n### 0. ІСТОРІЯ ПРИГОД (КОНТЕКСТ)\nОсь короткий підсумок того, що сталося раніше. Використовуй це, щоб пам'ятати події:\n${summary}\n` 
    : "";
  
  // Use the first character (Host) to determine the world setting
  const mainChar = party[0];
  const settingSection = mainChar?.worldSetting 
    ? `\n### СЕТТИНГ (СВІТ)\nПригода відбувається у світі: **${mainChar.worldSetting}**. Дотримуйся атмосфери, технологічного рівня та лору цього світу. Описуй локації та NPC відповідно до цього стилю.`
    : "";

  // Generate Party Roster
  const partyDescription = party.map(char => {
      let classDescription = `${char.class} (${char.level} рівень)`;
      if (char.classes && char.classes.length > 0) {
          classDescription = char.classes.map(c => `${c.name} ${c.level} lvl`).join(' / ');
      }
      return `- **${char.name}**: ${char.race} ${classDescription} (${char.gender}). HP: ${char.hp}/${char.maxHp}. AC: ${char.ac}.`;
  }).join('\n');

  return `
Ти — професійний Майстер Підземель (Dungeon Master, DM) для гри Dungeons & Dragons 5th Edition (SRD).
Твоя мова — Українська. Твій стиль — атмосферний, справедливий, але суворий щодо правил.

${settingSection}

### ВАЖЛИВО ПРО КОНТЕКСТ:
В кожному повідомленні користувача може бути блок **[CURRENT GAME STATE]**. 
Це АВТОМАТИЧНИЙ знімок стану гри (позиції токенів, здоров'я, активний бій).
ЗАВЖДИ перевіряй цей блок перед прийняттям рішень. Він показує, де насправді знаходяться персонажі та вороги на сітці 20x15.

### КРИТИЧНО ВАЖЛИВО ДЛЯ ВІЗУАЛІЗАЦІЇ:
Коли ти описуєш нову локацію через \`update_location\`, ти повинен надати опис, який ідеально підходить для генерації тактичної карти (Battle Map) з видом зверху.
Описуй форму кімнати, тип підлоги, розташування стін та перешкод.

${summarySection}
### 1. ГРУПА ГЕРОЇВ (THE PARTY)
Ти ведеш гру для наступних персонажів:
${partyDescription}

### 2. КЕРУВАННЯ СТАНОМ ГРИ (Functions)
Ти маєш повний контроль над світом через інструменти. ВИКОРИСТОВУЙ ЇХ АКТИВНО.
- **Світ:** \`update_location\` (ОБОВ'ЯЗКОВО викликай це при зміні сцени), \`update_weather\`.
- **Токени/Мапа:** \`spawn_token\` (створити ворога), \`move_token\` (рухати ворога), \`remove_token\` (вбити ворога).
- **HP/Інвентар:** \`update_hp\`, \`modify_inventory\`. Вказуй ім'я цілі (target).
- **Кидки:** \`request_roll\` (для Атаки, Перевірок). Вказуй ім'я цілі (target).
- **Квести/Журнал:** \`update_quest\`, \`add_note\`.
- **Бій:** \`manage_combat\`, \`trigger_effect\`.

Коли починається бій, спочатку заспавни токени (\`spawn_token\`), а потім ініціалізуй бій (\`manage_combat\`).
Починай гру.
`;
};

const MODEL_CONFIG = {
  temperature: 0.9,
  topK: 40,
  topP: 0.95,
};

// Wrapper to safely send messages using the QUEUE
export const sendWithRetry = async (chat: Chat, message: any): Promise<GenerateContentResponse> => {
  // message can be string or Part[]
  return enqueueRequest(() => chat.sendMessage({ message }));
};

// Wrapper to safely stream messages using the QUEUE
export const sendStreamWithRetry = async (
  chat: Chat,
  message: any,
  onChunk: (text: string) => void
): Promise<GenerateContentResponse> => {
  return enqueueRequest(async () => {
    const stream = await chat.sendMessageStream({ message });
    
    let accumulatedText = "";
    let finalChunk: GenerateContentResponse | null = null;
    let accumulatedFunctionCalls: any[] = [];

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        accumulatedText += text;
        onChunk(text);
      }
      if (chunk.functionCalls) {
         accumulatedFunctionCalls.push(...chunk.functionCalls);
      }
      finalChunk = chunk;
    }
    
    // Return a synthetic response containing the full text and found function calls
    // This allows the existing logic in chatSlice to handle tools
    return {
        ...finalChunk,
        text: accumulatedText,
        functionCalls: accumulatedFunctionCalls.length > 0 ? accumulatedFunctionCalls : undefined,
        candidates: finalChunk?.candidates 
    } as GenerateContentResponse;
  });
};

export const createDMSession = async (party: Character[], summary?: string): Promise<Chat | null> => {
  if (!ai) return null;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: getSystemInstruction(party, summary),
        tools: [{ functionDeclarations: dmTools }],
        ...MODEL_CONFIG
      }
    });
    
    return chat;
  } catch (error) {
    console.error("Error creating chat session:", error);
    return null;
  }
};

export const resumeDMSession = async (party: Character[], messages: Message[], summary?: string): Promise<Chat | null> => {
  if (!ai) return null;

  // Convert app Message format to Gemini Content format
  const history: Content[] = messages
    .filter(msg => !msg.isError)
    .map(msg => {
      let role = 'user';
      let text = msg.text;

      if (msg.sender === Sender.AI) {
        role = 'model';
      } else if (msg.sender === Sender.System) {
        role = 'user';
        text = `[System Info]: ${msg.text}`;
      }

      return {
        role: role,
        parts: [{ text: text }]
      };
    });

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: getSystemInstruction(party, summary),
        tools: [{ functionDeclarations: dmTools }],
        ...MODEL_CONFIG
      },
      history: history
    });
    
    return chat;
  } catch (error) {
    console.error("Error resuming chat session:", error);
    return null;
  }
};

// New Function for DM Tools (Stateless generation)
export const generateDMContent = async (prompt: string, context?: string): Promise<string> => {
  if (!ai) return "Error: AI not initialized";

  const fullPrompt = `
    Role: D&D 5e Dungeon Master Assistant (Generator).
    Language: Ukrainian.
    Context Setting: ${context || "Generic Fantasy"}.
    
    Task: ${prompt}
    
    Output Requirement: Return ONLY the requested content. Concise, ready to use. Use Markdown.
  `;

  try {
    return await enqueueRequest(async () => {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash', // Use flash for speed
        contents: fullPrompt,
        config: {
           temperature: 1.0, // High creativity
        }
      });
      return response.text || "Failed to generate content.";
    });
  } catch (error) {
    console.error("DM Generation Error:", error);
    return "Error generating content.";
  }
};

export const generateMonsterStatBlock = async (description: string): Promise<CustomMonster | null> => {
    if (!ai) return null;

    const prompt = `Create a D&D 5e Monster Stat Block based on: "${description}".`;

    const monsterSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        hp: { type: Type.INTEGER },
        ac: { type: Type.INTEGER },
        size: { type: Type.STRING, enum: ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] },
        description: { type: Type.STRING }
      },
      required: ['name', 'hp', 'ac', 'size', 'description']
    };

    try {
        return await enqueueRequest(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: monsterSchema
                }
            });
            
            const text = response.text;
            if (!text) return null;
            
            const data = JSON.parse(text); // Strict parsing thanks to responseSchema

            return {
                id: Math.random().toString(36).substr(2, 9),
                name: data.name,
                hp: data.hp,
                ac: data.ac,
                size: data.size,
                description: data.description
            };
        });
    } catch (error) {
        console.error("Monster Gen Error:", error);
        return null;
    }
};

export const generateShopInventory = async (locationName: string, shopType: string, worldSetting: string): Promise<ShopItem[]> => {
    if (!ai) return [];

    const prompt = `
    Generate a shop inventory for a D&D 5e store.
    Location: ${locationName}.
    Shop Type: ${shopType}.
    World Setting: ${worldSetting}.
    Create 6-12 items. Prices in Gold (GP).
    `;

    const shopSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.INTEGER },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['weapon', 'armor', 'potion', 'misc', 'magic'] }
        },
        required: ['name', 'price', 'type']
      }
    };

    try {
        return await enqueueRequest(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: shopSchema
                }
            });
            
            const text = response.text;
            if (!text) return [];
            
            const data = JSON.parse(text);
            return Array.isArray(data) ? data : [];
        });
    } catch (error) {
        console.error("Shop Gen Error:", error);
        return [];
    }
};

export const generateItemImage = async (description: string): Promise<string | null> => {
  if (!ai) return null;

  const prompt = `
    Game Icon: ${description}
    Style: High quality fantasy RPG icon art, detailed, centered, on a dark or neutral background.
    Digital painting, concept art style.
  `;

  try {
    return await enqueueRequest(async () => {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && part.inlineData && part.inlineData.data) {
        const base64ImageBytes = part.inlineData.data;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
      return null;
    });
  } catch (error) {
    console.error("Error generating item image:", error);
    return null;
  }
};

export const generateCharacterAvatar = async (character: Character): Promise<string | null> => {
  if (!ai) return null;

  const importantItems = character.inventory.slice(0, 4).join(', ');
  const worldStyle = character.worldSetting ? `Setting: ${character.worldSetting}.` : "";
  
  const prompt = `
    Dungeons and Dragons character portrait.
    Name: ${character.name}.
    Gender: ${character.gender}.
    Race: ${character.race}.
    Class: ${character.class}.
    ${worldStyle}
    
    PHYSICAL APPEARANCE (Must preserve): ${character.appearance || 'Heroic, detailed face'}.
    
    CURRENT EQUIPMENT (Must display):
    Wearing/Holding: ${importantItems}.
    
    Style: High quality digital fantasy painting, semi-realistic, dramatic lighting, concept art style, oil painting texture, detailed background.
    Shot: Upper body or portrait.
  `;

  try {
    return await enqueueRequest(async () => {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && part.inlineData && part.inlineData.data) {
        const base64ImageBytes = part.inlineData.data;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
      return null;
    });
  } catch (error) {
    console.error("Error generating character avatar:", error);
    return null;
  }
};

export const generateLocationImage = async (description: string): Promise<string | null> => {
  if (!ai) return null;

  const prompt = `
    Top-down Tabletop RPG Battle Map.
    
    Scene Description: ${description}
    
    Perspective: Orthographic top-down view (90 degrees), perfect for a 2D grid.
    Style: High quality fantasy digital art, detailed textures, neutral lighting, realistic scale.
    Constraint: NO GRID LINES on the image (grid is applied by overlay). NO UI elements.
    The image should look like a playable battle map for D&D.
  `;

  try {
    return await enqueueRequest(async () => {
        const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            imageConfig: {
              aspectRatio: "4:3"
            }
        },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part.inlineData && part.inlineData.data) {
            const base64ImageBytes = part.inlineData.data;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        return null;
    });
  } catch (error) {
    console.error("Error generating location image:", error);
    return null;
  }
};

// Helper function to draw grid on image for AI analysis
const applyGridOverlay = async (base64ImageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64ImageUrl);
                return;
            }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Draw 20x15 Grid (matching BattleMap.tsx logic)
            const cols = 20;
            const rows = 15;
            const cellW = canvas.width / cols;
            const cellH = canvas.height / rows;

            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'; // Cyan
            ctx.font = `${Math.floor(cellH/3)}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    const xPos = x * cellW;
                    const yPos = y * cellH;
                    
                    // Draw cell border
                    ctx.strokeRect(xPos, yPos, cellW, cellH);
                    
                    // Draw coordinates occasionally or simply
                    if (x % 2 === 0 && y % 2 === 0) {
                         // Small coordinate number in top-left
                         ctx.fillText(`${x},${y}`, xPos + cellW/2, yPos + cellH/2);
                    }
                }
            }
            
            // Add clearer axis labels
            ctx.fillStyle = 'yellow';
            ctx.font = 'bold 24px Arial';
            ctx.fillText("GRID 20x15", canvas.width / 2, 30);

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(base64ImageUrl);
        img.src = base64ImageUrl;
    });
};

export const analyzeBattleMap = async (base64ImageUrl: string): Promise<MapObject[]> => {
  if (!ai) return [];

  // Extract pure base64 string
  let base64Data = base64ImageUrl;
  if (base64ImageUrl.includes(',')) {
      base64Data = base64ImageUrl.split(',')[1];
  }
  if (!base64Data) return [];

  try {
    // 1. Apply visual grid so AI can see coordinates
    const gridImage = await applyGridOverlay(base64ImageUrl);
    const gridBase64 = gridImage.split(',')[1];

    const prompt = `
    Analyze this D&D battle map image (GRID 20 cols x 15 rows).
    Identify visible objects: Walls, Doors, Chests, Hazards, Furniture.
    `;

    const mapSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['wall', 'door', 'chest', 'tree', 'rock', 'trap', 'fire', 'water'] },
          x: { type: Type.INTEGER },
          y: { type: Type.INTEGER },
          description: { type: Type.STRING },
          isPassable: { type: Type.BOOLEAN },
          isInteractable: { type: Type.BOOLEAN }
        },
        required: ['type', 'x', 'y', 'isPassable', 'isInteractable']
      }
    };

    return await enqueueRequest(async () => {
        const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
            { inlineData: { mimeType: 'image/jpeg', data: gridBase64 } },
            { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: mapSchema
        }
        });

        const text = response.text;
        if (!text) return [];
        
        const rawObjects = JSON.parse(text);
        
        // Add IDs and validate
        return Array.isArray(rawObjects) ? rawObjects.map((obj: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            type: obj.type,
            position: { x: Math.max(0, Math.min(19, obj.x)), y: Math.max(0, Math.min(14, obj.y)) },
            description: obj.description,
            isPassable: obj.isPassable,
            isInteractable: obj.isInteractable
        })) : [];
    });

  } catch (error) {
    console.error("Error analyzing battle map:", error);
    return [];
  }
};

export const generateStorySummary = async (currentSummary: string, recentMessages: Message[]): Promise<string> => {
  if (!ai) return currentSummary;

  const conversationText = recentMessages
    .map(m => `${m.sender === Sender.User ? 'Player' : m.sender === Sender.AI ? 'DM' : 'System'}: ${m.text}`)
    .join('\n');

  const prompt = `
    Act as a scribe summarizing a D&D session.
    
    PREVIOUS SUMMARY:
    ${currentSummary || "The adventure has just begun."}
    
    NEW EVENTS:
    ${conversationText}
    
    TASK:
    Update the summary to include the new events. Keep it concise (max 200 words). 
    Focus on key plot points, decisions, and character status changes.
    Write in Ukrainian. Literary style (chronicles).
  `;

  try {
    // Background task, doesn't strictly need the main queue but good to avoid limits
    return await enqueueRequest(async () => {
        const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        });
        return response.text || currentSummary;
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return currentSummary;
  }
};

export const generateBackstory = async (character: Character): Promise<string> => {
    if (!ai) return "";

    const classDesc = character.classes?.map(c => c.name).join('/') || character.class;
    
    const prompt = `
        Create a compelling, tragic, or heroic backstory for a Dungeons & Dragons character.
        
        Name: ${character.name}
        Gender: ${character.gender}
        Race: ${character.race}
        Class: ${classDesc}
        World Setting: ${character.worldSetting}
        Stats Priority: Highest is ${Object.entries(character.stats).sort((a,b) => b[1] - a[1])[0][0]}.
        
        Requirements:
        1. Write in Ukrainian.
        2. Keep it under 200 words.
        3. Include one "Secret" or "Goal" that the DM can use as a plot hook.
        4. Explain why they became an adventurer.
    `;

    try {
        return await enqueueRequest(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { temperature: 0.9 }
            });
            return response.text || "";
        });
    } catch (e) {
        console.error("Backstory Gen Error", e);
        return "";
    }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
    if (!ai) return null;

    // Limit text length to avoid huge latency
    const safeText = text.slice(0, 500);

    try {
        return await enqueueRequest(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: {
                    parts: [{ text: safeText }]
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName }
                        }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            return audioData || null;
        });
    } catch (e) {
        console.error("TTS Generation Error:", e);
        return null;
    }
};

export const generateCampaignChapter = async (summary: string, worldSetting: string): Promise<string> => {
    if (!ai) return "";

    const prompt = `
    Act as a Fantasy Novelist.
    Rewrite the following D&D campaign summary into a dramatic, engaging chapter of a book.
    
    World Setting: ${worldSetting}
    Context Summary:
    ${summary}
    
    Requirements:
    1. Language: Ukrainian.
    2. Give it a cool Title (e.g., "Chapter 3: The Dark Caverns").
    3. Use descriptive language, focus on atmosphere and emotions.
    4. Length: 300-500 words.
    5. Do NOT invent facts that contradict the summary, but embellish the descriptions.
    `;

    try {
        return await enqueueRequest(async () => {
            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { temperature: 0.8 }
            });
            return response.text || "";
        });
    } catch (e) {
        console.error("Chapter Generation Error:", e);
        return "Не вдалося записати главу в літопис.";
    }
};

// --- RAG EMBEDDINGS ---

export const getEmbedding = async (text: string): Promise<number[] | null> => {
  if (!ai) return null;
  const cleanText = text.trim().slice(0, 2000); 
  if (!cleanText) return null;

  try {
    return await enqueueRequest(async () => {
        const response = await ai!.models.embedContent({
            model: 'text-embedding-004',
            contents: { parts: [{ text: cleanText }] }
        });
        return response.embeddings?.[0]?.values || null;
    });
  } catch (error) {
    console.warn("Embedding generation failed:", error);
    return null;
  }
};
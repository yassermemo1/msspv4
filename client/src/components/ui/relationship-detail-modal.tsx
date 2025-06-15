import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EntityLink } from '@/components/ui/entity-link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RelationshipGroup } from '@shared/entity-relations';

interface RelationshipDetailModalProps {
  group: RelationshipGroup | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const RelationshipDetailModal: React.FC<RelationshipDetailModalProps> = ({ group, isOpen, onOpenChange }) => {
  if (!group) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{group.displayName}</span>
            <Badge variant="secondary">{group.count}</Badge>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <ScrollArea className="h-96">
            <div className="space-y-2 pr-4">
              {group.relationships.map(relationship => {
                const entity = relationship.isReverse
                  ? relationship.sourceEntity
                  : relationship.targetEntity;

                return (
                  <EntityLink
                    key={relationship.id}
                    entity={relationship.targetEntity}
                    showIcon={true}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}; 